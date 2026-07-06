-- Lingrazul: migrate ALL kana (hiragana + katakana, no kanji) out of the
-- live letters_japanese table and into the new v2 tree (categories,
-- letters, letter_translations).
--
-- This ONLY READS from letters_japanese - never inserts, updates, or
-- deletes anything in it. It's purely additive to the v2 tables, same as
-- every other v2 file. Reusing the live, already-verified data instead of
-- retyping ~100+ kana characters from memory avoids introducing new typos
-- into content that's already correct in production.
--
-- Kanji rows (has_kanji = true) are deliberately excluded - those go
-- through the unique_features/kanji path in a separate migration, not
-- here.
--
-- Each letters_japanese row becomes up to TWO letters rows (one hiragana,
-- one katakana - whichever columns aren't null), matching the earlier
-- decision to split scripts into separate rows via letter_type_id instead
-- of pairing them on one row. Each new letter also gets ONE
-- letter_translations row (its old `romaji` value, target = English,
-- is_primary = true) - romaji is a translation now, not its own column.
--
-- The old tags array (e.g. {"hiragana","katakana","beginner"}) had
-- "hiragana"/"katakana" baked in as tags because both scripts lived on one
-- row. That's redundant now that letter_type_id says which script a row
-- is, so those two tag values are stripped on the way in; everything else
-- (e.g. "beginner", "intermediate") is kept.
--
-- Safe to re-run: every insert has an ON CONFLICT DO NOTHING matched to
-- the real constraint (categories' unique key, letters' unique
-- (language_id, letter_type_id, character), and letter_translations'
-- partial "one primary" index) - re-running just fills in anything
-- missing rather than duplicating or erroring.
--
-- Must be run in the same Supabase project as the live app (it reads
-- letters_japanese, which only exists there). Run after v2_content_schema.sql
-- and v2_schema_hardening.sql.
--
-- Run in the Supabase SQL editor.


-- =========================================================================
-- 1. Categories - one per distinct category used by kana rows in
--    letters_japanese (vowel, k-row, s-row, ..., dakuten, handakuten,
--    youon, katakana_extended, etc.) Label is auto-derived (e.g.
--    'k-row' -> 'K Row') - adjust labels by hand afterwards if you want
--    nicer display text.
-- =========================================================================

insert into categories (language_id, content_type, key, label, sort_order)
select
  (select id from languages where code = 'ja'),
  'letter',
  lj.category,
  initcap(replace(lj.category, '-', ' ')),
  0
from (
  select distinct category
  from letters_japanese
  where coalesce(has_kanji, false) = false
) lj
on conflict (language_id, content_type, key) do nothing;


-- =========================================================================
-- 2. Hiragana letters.
-- =========================================================================

insert into letters (language_id, category_id, letter_type_id, character, difficulty, tags)
select
  (select id from languages where code = 'ja'),
  c.id,
  (select id from letter_types
    where key = 'hiragana' and language_id = (select id from languages where code = 'ja')),
  lj.hiragana,
  lj.difficulty,
  array_remove(array_remove(coalesce(lj.tags, '{}'), 'hiragana'), 'katakana')
from letters_japanese lj
join categories c
  on c.language_id = (select id from languages where code = 'ja')
  and c.content_type = 'letter'
  and c.key = lj.category
where coalesce(lj.has_kanji, false) = false
  and lj.hiragana is not null
on conflict (language_id, letter_type_id, character) do nothing;


-- =========================================================================
-- 3. Katakana letters.
-- =========================================================================

insert into letters (language_id, category_id, letter_type_id, character, difficulty, tags)
select
  (select id from languages where code = 'ja'),
  c.id,
  (select id from letter_types
    where key = 'katakana' and language_id = (select id from languages where code = 'ja')),
  lj.katakana,
  lj.difficulty,
  array_remove(array_remove(coalesce(lj.tags, '{}'), 'hiragana'), 'katakana')
from letters_japanese lj
join categories c
  on c.language_id = (select id from languages where code = 'ja')
  and c.content_type = 'letter'
  and c.key = lj.category
where coalesce(lj.has_kanji, false) = false
  and lj.katakana is not null
on conflict (language_id, letter_type_id, character) do nothing;


-- =========================================================================
-- 4. Romaji, as letter_translations - hiragana side.
-- =========================================================================

insert into letter_translations (letter_id, target_language_id, transliteration, is_primary)
select
  l.id,
  (select id from languages where code = 'en'),
  lj.romaji,
  true
from letters_japanese lj
join letters l
  on l.character = lj.hiragana
  and l.language_id = (select id from languages where code = 'ja')
  and l.letter_type_id = (select id from letter_types
    where key = 'hiragana' and language_id = (select id from languages where code = 'ja'))
where coalesce(lj.has_kanji, false) = false
  and lj.hiragana is not null
on conflict (letter_id, target_language_id) where is_primary do nothing;


-- =========================================================================
-- 5. Romaji, as letter_translations - katakana side.
-- =========================================================================

insert into letter_translations (letter_id, target_language_id, transliteration, is_primary)
select
  l.id,
  (select id from languages where code = 'en'),
  lj.romaji,
  true
from letters_japanese lj
join letters l
  on l.character = lj.katakana
  and l.language_id = (select id from languages where code = 'ja')
  and l.letter_type_id = (select id from letter_types
    where key = 'katakana' and language_id = (select id from languages where code = 'ja'))
where coalesce(lj.has_kanji, false) = false
  and lj.katakana is not null
on conflict (letter_id, target_language_id) where is_primary do nothing;
