-- Lingrazul: unique_features - a plug-in point for parts of a language that
-- don't cleanly fit the letter/word split. Kanji is the first case: it's
-- kind of a word (it has a meaning) and kind of a letter (it has a
-- reading), so instead of sitting as its own top-level content_type next to
-- 'letter'/'word', it gets rerouted through a generic 'unique_feature'
-- content_type. `unique_features` is the registry of those odd,
-- language-specific things - (Japanese, 'kanji') today, and a future
-- language's own quirk (honorifics, measure words, whatever) is just
-- another row here later, with its own dedicated table(s) hanging off it
-- the same way `kanji` does - without touching the core letter/word/
-- category tree at all.
--
-- Categories keep working exactly the same way for kanji as for everything
-- else - a kanji category (e.g. 'n5') is still just a row in `categories`,
-- just with content_type = 'unique_feature' and a unique_feature_id
-- pointing at the 'kanji' row below, instead of a bespoke 'kanji'
-- content_type value.
--
-- Assumes supabase/sql/v2_content_schema.sql has already been run - this
-- ALTERs categories/kanji rather than recreating the whole tree. Still
-- creates/touches nothing on the live letters_japanese/words_*/
-- word_descriptions tables. Safe to re-run.
--
-- Run in the Supabase SQL editor, after v2_content_schema.sql.


-- =========================================================================
-- 1. unique_features - the registry of language-specific odd quirks.
-- =========================================================================

create table if not exists unique_features (
  id uuid primary key default gen_random_uuid(),
  language_id uuid not null references languages (id) on delete cascade,
  key text not null,           -- e.g. 'kanji'
  label text not null,         -- display label
  created_at timestamptz not null default now(),
  unique (language_id, key)
);

insert into unique_features (language_id, key, label)
select id, 'kanji', 'Kanji' from languages where code = 'ja'
on conflict (language_id, key) do nothing;


-- =========================================================================
-- 2. categories - reroute: 'kanji' is no longer its own content_type.
--    content_type becomes ('letter', 'word', 'unique_feature'), and a new
--    nullable unique_feature_id says WHICH unique feature a category
--    belongs to when content_type = 'unique_feature' (null otherwise).
--
--    The content_type check constraint's name is looked up dynamically
--    (rather than assumed as "categories_content_type_check") so this
--    doesn't risk silently leaving the OLD, more restrictive constraint in
--    place alongside the new one if Postgres happened to auto-name it
--    something else - that would block every real 'unique_feature' insert.
-- =========================================================================

do $$
declare
  old_check_name text;
begin
  select con.conname into old_check_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  where rel.relname = 'categories'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%content_type%';

  if old_check_name is not null then
    execute format('alter table categories drop constraint %I', old_check_name);
  end if;
end $$;

alter table categories add column if not exists unique_feature_id uuid
  references unique_features (id) on delete cascade;

alter table categories add constraint categories_content_type_check
  check (content_type in ('letter', 'word', 'unique_feature'));

alter table categories drop constraint if exists categories_unique_feature_id_check;

alter table categories add constraint categories_unique_feature_id_check
  check (
    (content_type = 'unique_feature' and unique_feature_id is not null)
    or (content_type <> 'unique_feature' and unique_feature_id is null)
  );

create index if not exists categories_unique_feature_idx
  on categories (unique_feature_id)
  where unique_feature_id is not null;


-- =========================================================================
-- 3. kanji - now hangs off unique_features instead of being a bare
--    top-level content type. Denormalized unique_feature_id added directly
--    to kanji, same as language_id already is, so you don't have to join
--    through categories to know "this is kanji." kanji_readings and
--    kanji_translations are untouched - they still just hang off kanji.id.
-- =========================================================================

alter table kanji add column if not exists unique_feature_id uuid
  references unique_features (id) on delete restrict;

update kanji k set unique_feature_id = uf.id
from unique_features uf
where uf.key = 'kanji'
  and uf.language_id = k.language_id
  and k.unique_feature_id is null;

alter table kanji alter column unique_feature_id set not null;

create index if not exists kanji_unique_feature_idx
  on kanji (unique_feature_id);
