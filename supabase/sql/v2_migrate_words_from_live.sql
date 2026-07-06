-- Lingrazul: migrate ALL words out of the live words_japanese /
-- words_english / word_descriptions tables and into the new v2 tree
-- (categories, words, word_translations).
--
-- This ONLY READS from words_japanese/words_english/word_descriptions -
-- never inserts, updates, or deletes anything in them. Purely additive to
-- the v2 tables, same as the kana migration.
--
-- PREREQUISITE TO CHECK FIRST: this assumes word_descriptions already has
-- a `tags` column (added via supabase/sql/add_tags_to_word_descriptions.sql).
-- Per AGENTS.md, it isn't confirmed that script has actually been run
-- against the live DB. If word_descriptions.tags doesn't exist yet, this
-- script will fail outright with "column tags does not exist" - run that
-- migration first (or tell me and I'll adjust this file to default tags
-- to '{}' instead of reading a column that isn't there).
--
-- words_chinese is deliberately NOT migrated here - AGENTS.md flags it as
-- unused by app code, and there's no 'zh' row in the new `languages` table
-- yet anyway. Add a Chinese migration later if/when that becomes real.
--
-- The old id-matching trick (word_descriptions.id = words_japanese.id =
-- words_english.id, no real FK) is only used to pull the two tables'
-- text together during this migration - the new schema doesn't carry that
-- pattern forward. word_descriptions.description becomes the `notes` field
-- on the new word_translations row (context/definition alongside the
-- literal translation), matching the "translation isn't always a clean
-- word-for-word match" reasoning from the schema design.
--
-- Unlike the kana migration, `words` has no natural unique constraint to
-- hang an ON CONFLICT off of, so idempotency here is done with a NOT
-- EXISTS guard instead - safe to re-run without creating duplicate word
-- rows.
--
-- Must be run in the same Supabase project as the live app. Run after
-- v2_content_schema.sql and v2_schema_hardening.sql.
--
-- Run in the Supabase SQL editor.


-- =========================================================================
-- 1. Categories - one per distinct category used in word_descriptions.
--    Label is auto-derived (e.g. 'particles' -> 'Particles') - adjust by
--    hand afterwards if you want nicer display text.
-- =========================================================================

insert into categories (language_id, content_type, key, label, sort_order)
select
  (select id from languages where code = 'ja'),
  'word',
  wd.category,
  initcap(replace(wd.category, '-', ' ')),
  0
from (select distinct category from word_descriptions) wd
on conflict (language_id, content_type, key) do nothing;


-- =========================================================================
-- 2. Words - the Japanese text itself.
-- =========================================================================

insert into words (language_id, category_id, text, difficulty, tags)
select
  (select id from languages where code = 'ja'),
  c.id,
  wj.text,
  wd.difficulty,
  coalesce(wd.tags, '{}')
from word_descriptions wd
join words_japanese wj on wj.id = wd.id
join categories c
  on c.language_id = (select id from languages where code = 'ja')
  and c.content_type = 'word'
  and c.key = wd.category
where not exists (
  select 1 from words w
  where w.language_id = (select id from languages where code = 'ja')
    and w.category_id = c.id
    and w.text = wj.text
);


-- =========================================================================
-- 3. Word translations - the English text, plus the old description as
--    `notes`. Joins back to the newly created words row by (category_id,
--    text) rather than the old shared id, since `words` has no old_id
--    column to carry that forward.
-- =========================================================================

insert into word_translations (word_id, target_language_id, translation, notes, is_primary)
select
  w.id,
  (select id from languages where code = 'en'),
  we.text,
  wd.description,
  true
from word_descriptions wd
join words_japanese wj on wj.id = wd.id
join words_english we on we.id = wd.id
join categories c
  on c.language_id = (select id from languages where code = 'ja')
  and c.content_type = 'word'
  and c.key = wd.category
join words w
  on w.category_id = c.id
  and w.text = wj.text
  and w.language_id = (select id from languages where code = 'ja')
on conflict (word_id, target_language_id) where is_primary do nothing;
