-- Lingrazul: hardening pass on the v2 content schema - closes the gaps
-- flagged in review (real at 1 language and a handful of rows, but the kind
-- of thing that quietly produces bad data once there are 4+ languages and
-- real content volume). No structural changes - just constraints, indexes,
-- and a trigger. Purely additive on top of tables that already exist.
--
-- Assumes supabase/sql/v2_content_schema.sql has already been run. Does not
-- require v2_unique_features.sql (nothing here touches unique_features).
-- Safe to re-run - everything is drop-then-create.
--
-- Run in the Supabase SQL editor, after v2_content_schema.sql.


-- =========================================================================
-- 1. "Exactly one primary" - is_primary was just a bare boolean with
--    nothing stopping two rows for the same (item, target language) both
--    claiming to be primary, or none at all. Partial unique indexes make
--    "at most one primary" an actual guarantee instead of a convention.
--
--    kanji_readings has no target-language dimension (reading_type is the
--    dimension: on'yomi/kun'yomi/nanori/other) - primary here means "the
--    one reading to show by default for this kanji," so it's scoped to
--    kanji_id alone, not kanji_id + reading_type.
-- =========================================================================

drop index if exists word_translations_primary_idx;
create unique index word_translations_primary_idx
  on word_translations (word_id, target_language_id)
  where is_primary;

drop index if exists kanji_translations_primary_idx;
create unique index kanji_translations_primary_idx
  on kanji_translations (kanji_id, target_language_id)
  where is_primary;

drop index if exists letter_translations_primary_idx;
create unique index letter_translations_primary_idx
  on letter_translations (letter_id, target_language_id)
  where is_primary;

drop index if exists kanji_readings_primary_idx;
create unique index kanji_readings_primary_idx
  on kanji_readings (kanji_id)
  where is_primary;


-- =========================================================================
-- 2. Composite indexes tuned to the real query ("the translation of THIS
--    item INTO THIS language" / "THIS kanji's readings of THIS type"),
--    replacing the single-column item-id index (the composite's leading
--    column already covers "item-id alone" lookups). The target-language
--    single-column indexes stay as-is - useful on their own for a reverse
--    lookup ("everything translated into French").
-- =========================================================================

drop index if exists word_translations_word_idx;
create index word_translations_word_target_idx
  on word_translations (word_id, target_language_id);

drop index if exists kanji_translations_kanji_idx;
create index kanji_translations_kanji_target_idx
  on kanji_translations (kanji_id, target_language_id);

drop index if exists letter_translations_letter_idx;
create index letter_translations_letter_target_idx
  on letter_translations (letter_id, target_language_id);

drop index if exists kanji_readings_kanji_idx;
create index kanji_readings_kanji_type_idx
  on kanji_readings (kanji_id, reading_type);


-- =========================================================================
-- 3. Denormalized language_id can drift from what category_id (or, for
--    letters, letter_type_id) implies - nothing previously stopped a row
--    from setting language_id to one language while pointing at another
--    language's category. These triggers make that a hard error instead of
--    silently-bad data, without giving up the denormalized column (still
--    avoids a join for every "get me all Japanese words" query).
-- =========================================================================

create or replace function enforce_language_matches_category()
returns trigger
language plpgsql
as $$
declare
  cat_language_id uuid;
begin
  select language_id into cat_language_id from categories where id = new.category_id;

  if cat_language_id is null then
    raise exception 'category_id % does not exist in categories', new.category_id;
  end if;

  if cat_language_id <> new.language_id then
    raise exception 'language_id % does not match categories.language_id % for category_id %',
      new.language_id, cat_language_id, new.category_id;
  end if;

  return new;
end;
$$;

drop trigger if exists words_language_matches_category on words;
create trigger words_language_matches_category
  before insert or update of language_id, category_id on words
  for each row execute procedure enforce_language_matches_category();

drop trigger if exists kanji_language_matches_category on kanji;
create trigger kanji_language_matches_category
  before insert or update of language_id, category_id on kanji
  for each row execute procedure enforce_language_matches_category();

-- letters has the same category risk PLUS the same risk against
-- letter_type_id (a letter could reference a letter_type belonging to a
-- different language than its own language_id/category) - one dedicated
-- function checks both.

create or replace function enforce_letters_language_consistency()
returns trigger
language plpgsql
as $$
declare
  cat_language_id uuid;
  type_language_id uuid;
begin
  select language_id into cat_language_id from categories where id = new.category_id;
  if cat_language_id is null then
    raise exception 'category_id % does not exist in categories', new.category_id;
  end if;
  if cat_language_id <> new.language_id then
    raise exception 'letters.language_id % does not match categories.language_id % for category_id %',
      new.language_id, cat_language_id, new.category_id;
  end if;

  select language_id into type_language_id from letter_types where id = new.letter_type_id;
  if type_language_id is null then
    raise exception 'letter_type_id % does not exist in letter_types', new.letter_type_id;
  end if;
  if type_language_id <> new.language_id then
    raise exception 'letters.language_id % does not match letter_types.language_id % for letter_type_id %',
      new.language_id, type_language_id, new.letter_type_id;
  end if;

  return new;
end;
$$;

drop trigger if exists letters_language_matches_category on letters;
create trigger letters_language_matches_category
  before insert or update of language_id, category_id, letter_type_id on letters
  for each row execute procedure enforce_letters_language_consistency();


-- =========================================================================
-- 4. Prevent the same glyph from being inserted twice under the same
--    script (e.g. two 'あ' rows both under Japanese hiragana).
-- =========================================================================

alter table letters drop constraint if exists letters_language_type_character_key;
alter table letters add constraint letters_language_type_character_key
  unique (language_id, letter_type_id, character);
