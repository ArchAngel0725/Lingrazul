-- Lingrazul: migrate kanji out of the live letters_japanese table
-- (has_kanji = true rows) and into the v2 tree via unique_features.
--
-- This ONLY READS from letters_japanese - never inserts, updates, or
-- deletes anything in it.
--
-- Unlike the kana/words migrations, this one is NECESSARILY incomplete,
-- because the old schema never captured two things the new schema wants:
--   - reading_type (on'yomi vs kun'yomi) - the old data has exactly one
--     reading per kanji with no label at all, so it comes in as
--     reading_type = 'other' rather than a guess at which type it is.
--   - any English meaning - there is no "meaning" column anywhere in
--     letters_japanese for kanji rows, only a reading. kanji_translations
--     is intentionally left EMPTY by this script. That's real
--     content-authoring work (write the actual meaning of each kanji),
--     not something that can be mechanically derived from what's live.
-- Both gaps were an explicit, agreed trade-off (migrate what exists, fill
-- the rest in later) rather than something guessed at here.
--
-- Category handling is smarter than a straight copy: the old `category`
-- column is just the literal string 'kanji' on every kanji row (see
-- insert_n5_kanji.sql) - not useful as a grouping, since content_type =
-- 'unique_feature' + unique_feature_id already say "this is kanji." The
-- actually useful grouping (JLPT level) is sitting in `tags` instead (e.g.
-- {"kanji","n5"}). So the category key here is derived from whatever tag
-- is left after removing 'kanji' from the tags array - 'n5' today, 'n4'
-- automatically once N4 kanji get added the same way. That tag (and
-- 'kanji') is then also stripped from the tags copied onto the new row,
-- since both are now captured structurally instead of as loose text.
--
-- The old romaji value for kanji rows isn't carried forward - kanji_readings
-- stores the kana reading (from the old hiragana column), not a
-- romanization; there's nowhere in the v2 schema for it right now.
--
-- Idempotent via NOT EXISTS / ON CONFLICT DO NOTHING - safe to re-run.
--
-- Must be run in the same Supabase project as the live app. Run after
-- v2_content_schema.sql, v2_unique_features.sql, and v2_schema_hardening.sql.
--
-- Run in the Supabase SQL editor.


-- =========================================================================
-- 1. Categories - one per JLPT-level-ish tag found on kanji rows (today:
--    just 'n5'), content_type = 'unique_feature', linked to the 'kanji'
--    unique_feature. Reuses the 'n5' category already created by
--    v2_seed_test_data.sql if present.
-- =========================================================================

insert into categories (language_id, content_type, key, label, sort_order, unique_feature_id)
select distinct
  (select id from languages where code = 'ja'),
  'unique_feature',
  (array_remove(coalesce(lj.tags, '{}'), 'kanji'))[1],
  initcap((array_remove(coalesce(lj.tags, '{}'), 'kanji'))[1]),
  0,
  (select id from unique_features
    where key = 'kanji' and language_id = (select id from languages where code = 'ja'))
from letters_japanese lj
where coalesce(lj.has_kanji, false) = true
  and (array_remove(coalesce(lj.tags, '{}'), 'kanji'))[1] is not null
on conflict (language_id, content_type, key) do nothing;


-- =========================================================================
-- 2. Kanji rows themselves.
-- =========================================================================

insert into kanji (language_id, category_id, unique_feature_id, character, difficulty, tags)
select
  (select id from languages where code = 'ja'),
  c.id,
  (select id from unique_features
    where key = 'kanji' and language_id = (select id from languages where code = 'ja')),
  lj.kanji,
  lj.difficulty,
  array_remove(array_remove(coalesce(lj.tags, '{}'), 'kanji'), c.key)
from letters_japanese lj
join categories c
  on c.language_id = (select id from languages where code = 'ja')
  and c.content_type = 'unique_feature'
  and c.key = (array_remove(coalesce(lj.tags, '{}'), 'kanji'))[1]
where coalesce(lj.has_kanji, false) = true
  and lj.kanji is not null
  and not exists (
    select 1 from kanji k
    where k.language_id = (select id from languages where code = 'ja')
      and k.character = lj.kanji
  );


-- =========================================================================
-- 3. Kanji readings - the one reading the old data has, as reading_type =
--    'other' (unlabeled - see header). Joined back to the new kanji row by
--    (language_id, character), same technique used for words.
-- =========================================================================

insert into kanji_readings (kanji_id, reading, reading_type, is_primary)
select
  k.id,
  lj.hiragana,
  'other',
  true
from letters_japanese lj
join kanji k
  on k.character = lj.kanji
  and k.language_id = (select id from languages where code = 'ja')
where coalesce(lj.has_kanji, false) = true
  and lj.hiragana is not null
on conflict (kanji_id) where is_primary do nothing;


-- =========================================================================
-- 4. Kanji translations - deliberately NOT populated here. Example shape
--    for when real meanings are authored (uncomment and fill in):
--
-- insert into kanji_translations (kanji_id, target_language_id, translation, is_primary)
-- values (
--   (select id from kanji where character = '一'
--     and language_id = (select id from languages where code = 'ja')),
--   (select id from languages where code = 'en'),
--   'one, number one',
--   true
-- );
-- =========================================================================
