-- Lingrazul: Basics tab lessons schema.
--
-- The "Basics" tab (app/(tabs)/learn.tsx) has been a placeholder screen
-- showing nothing but the word "Learn". This adds real, curated lesson
-- content behind it - official, hand-authored lessons (not the earlier
-- "community lessons" idea, which is deferred), ordered the way a textbook
-- would order them: script/reading fundamentals before grammar/vocab.
--
-- Design notes (matches the conventions in v2_content_schema.sql):
--   - `lessons` sits under `languages`, same as `categories` does, so a new
--     language brings its own lesson set as rows, not new tables/columns.
--   - `lesson_sections` is the actual reading content, one row per
--     section/paragraph-block in reading order (sort_order), rather than one
--     giant text blob per lesson - lets a lesson be edited/reordered section
--     by section later, and keeps the door open for a future section "type"
--     (e.g. embedding a live example letter/word) without a schema change to
--     `lessons` itself.
--   - Content here is genuinely public reference content (like
--     letters/words/kanji), not user data, so it gets the same "Anyone can
--     read" RLS policy those tables ended up needing (see
--     v2_add_read_policies.sql and the RLS gotcha documented in AGENTS.md) -
--     added directly in this file instead of as a separate follow-up, now
--     that the gotcha is known up front.
--
-- Safe to re-run: drops both tables first, then recreates.
--
-- Run in the Supabase SQL editor, after the rest of the v2_* content schema
-- files (needs `languages` to exist).


-- =========================================================================
-- 0. Clean slate.
-- =========================================================================

drop table if exists lesson_sections cascade;
drop table if exists lessons cascade;


-- =========================================================================
-- 1. lessons - one row per lesson, scoped to a language.
-- =========================================================================

create table lessons (
  id uuid primary key default gen_random_uuid(),
  language_id uuid not null references languages (id) on delete cascade,
  key text not null,            -- e.g. 'hiragana-basics'
  title text not null,          -- e.g. 'Hiragana: The Basics'
  subtitle text,                -- short teaser shown in the lesson list
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (language_id, key)
);

create index lessons_language_idx
  on lessons (language_id, sort_order);

alter table lessons enable row level security;
create policy "Anyone can read lessons" on lessons for select using (true);


-- =========================================================================
-- 2. lesson_sections - the actual reading content, in order, per lesson.
-- =========================================================================

create table lesson_sections (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references lessons (id) on delete cascade,
  sort_order int not null default 0,
  heading text,                 -- optional sub-heading, e.g. 'The Five Vowels'
  body text not null,           -- section content (plain text, paragraphs separated by blank lines)
  created_at timestamptz not null default now()
);

create index lesson_sections_lesson_idx
  on lesson_sections (lesson_id, sort_order);

alter table lesson_sections enable row level security;
create policy "Anyone can read lesson sections" on lesson_sections for select using (true);
