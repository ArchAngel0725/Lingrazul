-- Lingrazul: v2 content schema - ground-up redesign of how language data is
-- stored, replacing the "one table per language" pattern (letters_japanese,
-- words_japanese, words_english, words_chinese, word_descriptions) with a
-- real tree: languages sit at the root, categories (which carry their data
-- type directly, not via a separate table) hang off a language, and the
-- actual content (letters, words, kanji) hangs off a category.
--
-- This file ONLY CREATES NEW TABLES. It does not touch, migrate, or read
-- from letters_japanese / words_* / word_descriptions / user_progress in any
-- way - the live app and live tables keep working completely untouched.
-- Migrating real data into this schema, and wiring the app to read from it,
-- are separate follow-up steps once this shape is confirmed. See CLAUDE.md's
-- "Supabase schema (live)" section for what's still authoritative today.
--
-- Design notes:
--   - Language is a real row (languages), not baked into a table name - so
--     adding a new language later is an insert, not a new set of tables.
--   - `categories` carries its data type (letter/word/kanji) as a column on
--     the same row, NOT as a foreign key out to a separate content_types
--     table. A category is one node with one outgoing relationship (to its
--     language) - not two independent parents. e.g. one row for
--     (Japanese, letter, 'k-row'), one for (Japanese, kanji, 'n5'), one for
--     (Japanese, word, 'particles').
--   - Kanji gets its OWN table, separate from both `letters` and `words`.
--     It's genuinely both: like a letter it can have more than one reading
--     (on'yomi/kun'yomi - the old letters_japanese schema only fit one
--     reading per row, flagged as a known simplification), and like a word
--     it has a meaning that needs translating. `kanji` borrows the reading
--     pattern (kanji_readings) AND the translation pattern (kanji_translations)
--     rather than being forced into either letters or words.
--   - Translations (for words, kanji, AND now letters) are NOT columns
--     (translation_en, translation_zh...) on the content row - that would
--     recreate the exact "add a language means schema change" problem the
--     languages table fixes. Instead each row gets one or more
--     *_translations rows pointing at a target language, since translation
--     isn't always a clean 1:1 match - more than one sense, or a `notes`
--     field for something non-literal, without ever needing an ALTER TABLE.
--   - `letters` no longer has a hardcoded `romaji` column - romaji IS a
--     translation/transliteration (implicitly assuming an English-speaking
--     learner), so it moves into `letter_translations` alongside
--     word_translations and kanji_translations, giving all three content
--     types the same shape.
--   - `letters` also no longer has hardcoded `hiragana`/`katakana` columns.
--     Those were two different writing systems baked in as fixed columns on
--     one row (same problem as translation_en/translation_zh columns would
--     have been). Instead `letter_types` is a lookup table scoped to a
--     language (Japanese -> hiragana, katakana; a future language brings its
--     own set with no schema change), and each `letters` row has one
--     `letter_type_id` plus a single generic `character` column for the
--     glyph. Trade-off: a hiragana/katakana pair that used to live on one
--     row (same sound, two scripts) is now two separate rows, linked only by
--     sharing the same `category_id` - there's no explicit "these two rows
--     are the same sound" link yet.
--   - No RLS is added here, matching the existing letters_japanese/words_*/
--     word_descriptions tables (none of them have RLS enabled either) -
--     this is public reference content maintained by hand via the SQL
--     editor, not user-generated data. If that ever changes, add RLS then.
--
-- Safe to re-run: drops any v2 tables first (including the old
-- `content_types` table from the previous version of this file, in case it
-- got created before), then recreates everything from scratch.
--
-- Run in the Supabase SQL editor.


-- =========================================================================
-- 0. Clean slate - drop everything this file creates, children first.
-- =========================================================================

drop table if exists kanji_translations cascade;
drop table if exists kanji_readings cascade;
drop table if exists kanji cascade;
drop table if exists word_translations cascade;
drop table if exists words cascade;
drop table if exists letter_translations cascade;
drop table if exists letters cascade;
drop table if exists letter_types cascade;
drop table if exists categories cascade;
drop table if exists content_types cascade; -- old (v1 of this file) - no longer used
drop table if exists languages cascade;


-- =========================================================================
-- 1. languages - the root of the tree.
-- =========================================================================

create table languages (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,   -- e.g. 'ja', 'en'
  name text not null,          -- e.g. 'Japanese'
  created_at timestamptz not null default now()
);

insert into languages (code, name) values
  ('ja', 'Japanese'),
  ('en', 'English');


-- =========================================================================
-- 2. categories - one node per (language, data type, category). data type
--    lives directly on this row (content_type column) instead of a separate
--    lookup table - a category has exactly one outgoing relationship:
--    language_id -> languages.
-- =========================================================================

create table categories (
  id uuid primary key default gen_random_uuid(),
  language_id uuid not null references languages (id) on delete cascade,
  content_type text not null check (content_type in ('letter', 'word', 'kanji')),
  key text not null,           -- e.g. 'k-row', 'n5', 'particles'
  label text not null,         -- display label
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (language_id, content_type, key)
);

create index categories_language_type_idx
  on categories (language_id, content_type);


-- =========================================================================
-- 3. letter_types - the writing-system dimension for letters, scoped to a
--    language (Japanese -> hiragana, katakana). A new language brings its
--    own set of types as rows, not new columns.
-- =========================================================================

create table letter_types (
  id uuid primary key default gen_random_uuid(),
  language_id uuid not null references languages (id) on delete cascade,
  key text not null,           -- e.g. 'hiragana', 'katakana'
  label text not null,         -- display label
  created_at timestamptz not null default now(),
  unique (language_id, key)
);

insert into letter_types (language_id, key, label)
select id, 'hiragana', 'Hiragana' from languages where code = 'ja'
union all
select id, 'katakana', 'Katakana' from languages where code = 'ja';


-- =========================================================================
-- 4. letters - kana only (kanji lives in its own table below). No romaji
--    column here - see letter_translations below. No hiragana/katakana
--    columns either - letter_type_id says which writing system this row is,
--    and `character` holds the glyph itself.
-- =========================================================================

create table letters (
  id uuid primary key default gen_random_uuid(),
  language_id uuid not null references languages (id) on delete cascade,
  category_id uuid not null references categories (id) on delete restrict,
  letter_type_id uuid not null references letter_types (id) on delete restrict,
  character text not null,   -- the glyph itself, e.g. 'あ' or 'ア'
  difficulty int not null default 1,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index letters_language_category_idx
  on letters (language_id, category_id);
create index letters_letter_type_idx
  on letters (letter_type_id);


-- =========================================================================
-- 5. letter_translations - a letter's phonetic representation for a target
--    language (e.g. romaji, for an English-speaking learner). Rows, not
--    columns, same reasoning as word/kanji translations below - a different
--    target language can need a different transliteration convention, and
--    a letter can have more than one accepted rendering.
-- =========================================================================

create table letter_translations (
  id uuid primary key default gen_random_uuid(),
  letter_id uuid not null references letters (id) on delete cascade,
  target_language_id uuid not null references languages (id) on delete cascade,
  transliteration text not null,   -- e.g. 'ka' for English
  notes text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create index letter_translations_letter_idx
  on letter_translations (letter_id);
create index letter_translations_target_language_idx
  on letter_translations (target_language_id);


-- =========================================================================
-- 6. words - one row per word IN a given language (not shared across
--    languages by an assumed-matching id, unlike words_japanese/words_english
--    today).
-- =========================================================================

create table words (
  id uuid primary key default gen_random_uuid(),
  language_id uuid not null references languages (id) on delete cascade,
  category_id uuid not null references categories (id) on delete restrict,
  text text not null,
  difficulty int not null default 1,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index words_language_category_idx
  on words (language_id, category_id);


-- =========================================================================
-- 7. word_translations - the "how to translate this word" data, as rows
--    rather than per-language columns. A word can have more than one row
--    per target language (multiple senses), plus notes for translations
--    that aren't a clean 1:1 match.
-- =========================================================================

create table word_translations (
  id uuid primary key default gen_random_uuid(),
  word_id uuid not null references words (id) on delete cascade,
  target_language_id uuid not null references languages (id) on delete cascade,
  translation text not null,
  notes text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create index word_translations_word_idx
  on word_translations (word_id);
create index word_translations_target_language_idx
  on word_translations (target_language_id);


-- =========================================================================
-- 8. kanji - its own top-level content type. Technically a letter
--    (it has a reading, or several) and technically a word (it has a
--    meaning that needs translating), so it gets both child tables below
--    instead of being force-fit into `letters` or `words`.
-- =========================================================================

create table kanji (
  id uuid primary key default gen_random_uuid(),
  language_id uuid not null references languages (id) on delete cascade,
  category_id uuid not null references categories (id) on delete restrict,
  character text not null,   -- the glyph itself, e.g. '一'
  difficulty int not null default 1,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index kanji_language_category_idx
  on kanji (language_id, category_id);


-- =========================================================================
-- 9. kanji_readings - the "letter" side of kanji: on'yomi/kun'yomi/other,
--    as many rows as needed instead of letters_japanese's one-reading-only
--    limitation.
-- =========================================================================

create table kanji_readings (
  id uuid primary key default gen_random_uuid(),
  kanji_id uuid not null references kanji (id) on delete cascade,
  reading text not null,
  reading_type text not null default 'other'
    check (reading_type in ('onyomi', 'kunyomi', 'nanori', 'other')),
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create index kanji_readings_kanji_idx
  on kanji_readings (kanji_id);


-- =========================================================================
-- 10. kanji_translations - the "word" side of kanji: its meaning(s) in a
--    target language. Same row-based shape as word_translations/
--    letter_translations.
-- =========================================================================

create table kanji_translations (
  id uuid primary key default gen_random_uuid(),
  kanji_id uuid not null references kanji (id) on delete cascade,
  target_language_id uuid not null references languages (id) on delete cascade,
  translation text not null,   -- e.g. 'one, number one'
  notes text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create index kanji_translations_kanji_idx
  on kanji_translations (kanji_id);
create index kanji_translations_target_language_idx
  on kanji_translations (target_language_id);
