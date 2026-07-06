-- Lingrazul: smoke-test seed data - exactly 2 real rows in every leaf/child
-- table (letters, letter_translations, words, word_translations, kanji,
-- kanji_readings, kanji_translations), to exercise the whole v2 tree
-- end-to-end - the FK chain, the translation/reading child tables, and the
-- hardening pass's constraints/triggers - before doing the real bulk
-- content pass. `categories` gets 3 rows, not 2, because letters/words/
-- kanji each need their own category (different content_type) and can't
-- share one across types - each of those 3 is reused by both test rows of
-- its type. `languages`, `letter_types`, and `unique_features` are left
-- alone - they're already seeded by the earlier files (2 languages, 2
-- letter types, and the one real `kanji` unique_feature - no fake second
-- row invented just to hit "2").
--
-- Content is real and accurate (あ/ア = "a", 猫 = "cat", 犬 = "dog",
-- 一 = "one", 二 = "two") - not placeholder junk - so it's a meaningful
-- check, not just a syntax test.
--
-- Assumes v2_content_schema.sql, v2_unique_features.sql, AND
-- v2_schema_hardening.sql have all been run - this data is deliberately
-- shaped to satisfy the hardening pass's triggers (language_id matches its
-- category/letter_type) and constraints (one primary per item+target,
-- no duplicate letters).
--
-- NOT written to be idempotent/re-runnable - `words` and `kanji` have no
-- natural uniqueness to key an ON CONFLICT off of. Meant to run once
-- against empty categories/letters/words/kanji tables. A commented-out
-- cleanup block is at the bottom if you want to wipe this test data before
-- the real bulk pass.
--
-- Run in the Supabase SQL editor.


-- =========================================================================
-- 1. Categories - one per content_type, each shared by both test rows of
--    that type.
-- =========================================================================

insert into categories (language_id, content_type, key, label, sort_order)
values
  ((select id from languages where code = 'ja'), 'letter', 'vowel', 'Vowels', 1),
  ((select id from languages where code = 'ja'), 'word', 'animals', 'Animals', 1);

insert into categories (language_id, content_type, key, label, sort_order, unique_feature_id)
values (
  (select id from languages where code = 'ja'),
  'unique_feature',
  'n5',
  'JLPT N5',
  1,
  (select id from unique_features
    where key = 'kanji' and language_id = (select id from languages where code = 'ja'))
);


-- =========================================================================
-- 2. Letters - あ (hiragana) / ア (katakana), same sound, two scripts,
--    two rows.
-- =========================================================================

insert into letters (language_id, category_id, letter_type_id, character, difficulty, tags)
values
  (
    (select id from languages where code = 'ja'),
    (select id from categories
      where key = 'vowel' and content_type = 'letter'
      and language_id = (select id from languages where code = 'ja')),
    (select id from letter_types
      where key = 'hiragana' and language_id = (select id from languages where code = 'ja')),
    'あ', 1, '{"hiragana","vowel"}'
  ),
  (
    (select id from languages where code = 'ja'),
    (select id from categories
      where key = 'vowel' and content_type = 'letter'
      and language_id = (select id from languages where code = 'ja')),
    (select id from letter_types
      where key = 'katakana' and language_id = (select id from languages where code = 'ja')),
    'ア', 1, '{"katakana","vowel"}'
  );


-- =========================================================================
-- 3. Letter translations - both transliterate to 'a' in English.
-- =========================================================================

insert into letter_translations (letter_id, target_language_id, transliteration, is_primary)
values
  (
    (select id from letters
      where character = 'あ'
      and language_id = (select id from languages where code = 'ja')),
    (select id from languages where code = 'en'),
    'a', true
  ),
  (
    (select id from letters
      where character = 'ア'
      and language_id = (select id from languages where code = 'ja')),
    (select id from languages where code = 'en'),
    'a', true
  );


-- =========================================================================
-- 4. Words - 猫 (cat), 犬 (dog).
-- =========================================================================

insert into words (language_id, category_id, text, difficulty, tags)
values
  (
    (select id from languages where code = 'ja'),
    (select id from categories
      where key = 'animals' and content_type = 'word'
      and language_id = (select id from languages where code = 'ja')),
    '猫', 1, '{"animals"}'
  ),
  (
    (select id from languages where code = 'ja'),
    (select id from categories
      where key = 'animals' and content_type = 'word'
      and language_id = (select id from languages where code = 'ja')),
    '犬', 1, '{"animals"}'
  );


-- =========================================================================
-- 5. Word translations.
-- =========================================================================

insert into word_translations (word_id, target_language_id, translation, is_primary)
values
  (
    (select id from words
      where text = '猫'
      and language_id = (select id from languages where code = 'ja')),
    (select id from languages where code = 'en'),
    'cat', true
  ),
  (
    (select id from words
      where text = '犬'
      and language_id = (select id from languages where code = 'ja')),
    (select id from languages where code = 'en'),
    'dog', true
  );


-- =========================================================================
-- 6. Kanji - 一 (one), 二 (two).
-- =========================================================================

insert into kanji (language_id, category_id, unique_feature_id, character, difficulty, tags)
values
  (
    (select id from languages where code = 'ja'),
    (select id from categories
      where key = 'n5' and content_type = 'unique_feature'
      and language_id = (select id from languages where code = 'ja')),
    (select id from unique_features
      where key = 'kanji' and language_id = (select id from languages where code = 'ja')),
    '一', 4, '{"kanji","n5"}'
  ),
  (
    (select id from languages where code = 'ja'),
    (select id from categories
      where key = 'n5' and content_type = 'unique_feature'
      and language_id = (select id from languages where code = 'ja')),
    (select id from unique_features
      where key = 'kanji' and language_id = (select id from languages where code = 'ja')),
    '二', 4, '{"kanji","n5"}'
  );


-- =========================================================================
-- 7. Kanji readings - one primary on'yomi reading each (more readings per
--    kanji are part of the real bulk pass, not this smoke test).
-- =========================================================================

insert into kanji_readings (kanji_id, reading, reading_type, is_primary)
values
  (
    (select id from kanji
      where character = '一'
      and language_id = (select id from languages where code = 'ja')),
    'いち', 'onyomi', true
  ),
  (
    (select id from kanji
      where character = '二'
      and language_id = (select id from languages where code = 'ja')),
    'に', 'onyomi', true
  );


-- =========================================================================
-- 8. Kanji translations.
-- =========================================================================

insert into kanji_translations (kanji_id, target_language_id, translation, is_primary)
values
  (
    (select id from kanji
      where character = '一'
      and language_id = (select id from languages where code = 'ja')),
    (select id from languages where code = 'en'),
    'one, number one', true
  ),
  (
    (select id from kanji
      where character = '二'
      and language_id = (select id from languages where code = 'ja')),
    (select id from languages where code = 'en'),
    'two, number two', true
  );


-- =========================================================================
-- Cleanup (commented out) - run this to wipe just this smoke-test data
-- before the real bulk content pass, without touching languages/
-- letter_types/unique_features or anything else.
-- =========================================================================

-- delete from kanji_translations where kanji_id in (
--   select id from kanji where character in ('一', '二')
-- );
-- delete from kanji_readings where kanji_id in (
--   select id from kanji where character in ('一', '二')
-- );
-- delete from kanji where character in ('一', '二');
-- delete from word_translations where word_id in (
--   select id from words where text in ('猫', '犬')
-- );
-- delete from words where text in ('猫', '犬');
-- delete from letter_translations where letter_id in (
--   select id from letters where character in ('あ', 'ア')
-- );
-- delete from letters where character in ('あ', 'ア');
-- delete from categories where key in ('vowel', 'animals', 'n5');
