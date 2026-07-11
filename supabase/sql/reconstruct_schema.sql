-- Lingrazul: RECONSTRUCT SCHEMA - a single consolidated snapshot of the
-- live database's structure as of 2026-07-11 (originally written 2026-07-06,
-- updated to fold in the lesson_type/lesson_section_blanks additions from
-- 2026-07-07 and the image_url/emoji columns + card-images storage bucket
-- from 2026-07-11), for version control. This is NOT a new migration step -
-- it's the flattened end state of every v2_*.sql file in this folder (plus
-- the v1 tables still actually in use), assembled into one file so the
-- schema's current shape lives in git as one readable source of truth
-- instead of only being reconstructable by reading a dozen incremental
-- files in the right order.
--
-- SCHEMA ONLY - no data. The tiny reference rows some tables need to be
-- usable (languages 'ja'/'en', letter_types hiragana/katakana,
-- unique_features 'kanji') are NOT inserted here on purpose (that's data,
-- not structure) - see the note at the bottom of this file for exactly
-- which follow-up files supply them.
--
-- SCOPE: covers the full v2 content/progress/lessons tree, plus the v1
-- tables the app still actually depends on (users, bug_reports) or still
-- has sitting around unused-but-present (letters_japanese, words_*,
-- word_descriptions, user_progress). Deliberately EXCLUDES content_items,
-- lesson_ratings, lesson_stats, copyright_claims, and sessions - these
-- appear in the live schema visualizer but match nothing in this repo or
-- AGENTS.md (they're leftovers from the original pre-v2 construct plan /
-- the proposed-but-not-adopted accounts_progress_community.sql design) -
-- excluded by explicit choice, not an oversight.
--
-- ACCURACY NOTE: the v2 tables, progress tables, and lessons tables below
-- are exact - copied from this repo's own v2_content_schema.sql,
-- v2_unique_features.sql, v2_schema_hardening.sql, v2_add_kanji_reading_romaji.sql,
-- v2_add_read_policies.sql, v2_progress_schema.sql, v2_lessons_schema.sql,
-- v2_add_lesson_type.sql, v2_add_lesson_blanks.sql, v2_add_photo_columns.sql,
-- and v2_add_emoji_column.sql, flattened to their current combined state.
-- The v1 tables in section F
-- (letters_japanese, words_japanese, words_english, words_chinese,
-- word_descriptions, user_progress) have NO creation script anywhere in
-- this repo's history - they were made directly via the Supabase table
-- editor - so those are reconstructed from AGENTS.md's documented column
-- lists, best-effort. Treat section F as "probably right, not verified
-- against a real pg_dump" - if exact precision ever matters (a real
-- disaster-recovery restore, not just version control), pull the real
-- definitions from Supabase's dashboard first.
--
-- Safe to re-run against an EMPTY database - drops everything this file
-- creates first, children before parents, then rebuilds from scratch. Do
-- NOT run this against the live database as-is unless you intend to wipe
-- and rebuild every table below - this is a structural snapshot for git,
-- not a routine migration.


-- =========================================================================
-- 0. Clean slate - drop everything this file creates, children first.
-- =========================================================================

drop table if exists kanji_progress cascade;
drop table if exists word_progress cascade;
drop table if exists letter_progress cascade;
drop table if exists lesson_section_blanks cascade;
drop table if exists lesson_sections cascade;
drop table if exists lessons cascade;
drop table if exists kanji_translations cascade;
drop table if exists kanji_readings cascade;
drop table if exists kanji cascade;
drop table if exists word_translations cascade;
drop table if exists words cascade;
drop table if exists letter_translations cascade;
drop table if exists letters cascade;
drop table if exists letter_types cascade;
drop table if exists categories cascade;
drop table if exists unique_features cascade;
drop table if exists languages cascade;
drop table if exists bug_reports cascade;
drop table if exists user_progress cascade;
drop table if exists word_descriptions cascade;
drop table if exists words_chinese cascade;
drop table if exists words_english cascade;
drop table if exists words_japanese cascade;
drop table if exists letters_japanese cascade;
drop table if exists users cascade;

drop function if exists enforce_language_matches_category() cascade;
drop function if exists enforce_letters_language_consistency() cascade;
drop function if exists public.handle_new_user() cascade;


-- =========================================================================
-- SECTION A: v2 content tree
-- =========================================================================

-- --- A1. languages - the root of the tree. --------------------------------

create table languages (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,   -- e.g. 'ja', 'en'
  name text not null,          -- e.g. 'Japanese'
  created_at timestamptz not null default now()
);

-- --- A2. unique_features - registry for language-specific odd quirks -----
--     (created before categories/kanji since both reference it)

create table unique_features (
  id uuid primary key default gen_random_uuid(),
  language_id uuid not null references languages (id) on delete cascade,
  key text not null,           -- e.g. 'kanji'
  label text not null,
  created_at timestamptz not null default now(),
  unique (language_id, key)
);

-- --- A3. categories - one node per (language, data type, category). ------

create table categories (
  id uuid primary key default gen_random_uuid(),
  language_id uuid not null references languages (id) on delete cascade,
  content_type text not null check (content_type in ('letter', 'word', 'unique_feature')),
  key text not null,           -- e.g. 'k-row', 'n5', 'particles'
  label text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique_feature_id uuid references unique_features (id) on delete cascade,
  constraint categories_unique_feature_id_check check (
    (content_type = 'unique_feature' and unique_feature_id is not null)
    or (content_type <> 'unique_feature' and unique_feature_id is null)
  ),
  unique (language_id, content_type, key)
);

create index categories_language_type_idx
  on categories (language_id, content_type);
create index categories_unique_feature_idx
  on categories (unique_feature_id)
  where unique_feature_id is not null;

-- --- A4. letter_types - writing-system dimension, scoped to a language ---

create table letter_types (
  id uuid primary key default gen_random_uuid(),
  language_id uuid not null references languages (id) on delete cascade,
  key text not null,           -- e.g. 'hiragana', 'katakana'
  label text not null,
  created_at timestamptz not null default now(),
  unique (language_id, key)
);

-- --- A5. letters - kana only (kanji lives in its own table) ---------------

create table letters (
  id uuid primary key default gen_random_uuid(),
  language_id uuid not null references languages (id) on delete cascade,
  category_id uuid not null references categories (id) on delete restrict,
  letter_type_id uuid not null references letter_types (id) on delete restrict,
  character text not null,   -- the glyph itself, e.g. 'あ' or 'ア'
  difficulty int not null default 1,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  image_url text,   -- added by v2_add_photo_columns.sql; null on nearly every row
  emoji text,       -- added by v2_add_emoji_column.sql; null unless hand-curated
  constraint letters_language_type_character_key unique (language_id, letter_type_id, character)
);

create index letters_language_category_idx
  on letters (language_id, category_id);
create index letters_letter_type_idx
  on letters (letter_type_id);

-- --- A6. letter_translations - phonetic representation per target lang ---

create table letter_translations (
  id uuid primary key default gen_random_uuid(),
  letter_id uuid not null references letters (id) on delete cascade,
  target_language_id uuid not null references languages (id) on delete cascade,
  transliteration text not null,   -- e.g. 'ka' for English
  notes text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index letter_translations_primary_idx
  on letter_translations (letter_id, target_language_id)
  where is_primary;
create index letter_translations_letter_target_idx
  on letter_translations (letter_id, target_language_id);
create index letter_translations_target_language_idx
  on letter_translations (target_language_id);

-- --- A7. words - one row per word IN a given language ---------------------

create table words (
  id uuid primary key default gen_random_uuid(),
  language_id uuid not null references languages (id) on delete cascade,
  category_id uuid not null references categories (id) on delete restrict,
  text text not null,
  difficulty int not null default 1,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  image_url text,   -- added by v2_add_photo_columns.sql; null on nearly every row
  emoji text        -- added by v2_add_emoji_column.sql; populated for animals + a few verbs
);

create index words_language_category_idx
  on words (language_id, category_id);

-- --- A8. word_translations -------------------------------------------------

create table word_translations (
  id uuid primary key default gen_random_uuid(),
  word_id uuid not null references words (id) on delete cascade,
  target_language_id uuid not null references languages (id) on delete cascade,
  translation text not null,
  notes text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index word_translations_primary_idx
  on word_translations (word_id, target_language_id)
  where is_primary;
create index word_translations_word_target_idx
  on word_translations (word_id, target_language_id);
create index word_translations_target_language_idx
  on word_translations (target_language_id);

-- --- A9. kanji - own top-level content type, routed through unique_features

create table kanji (
  id uuid primary key default gen_random_uuid(),
  language_id uuid not null references languages (id) on delete cascade,
  category_id uuid not null references categories (id) on delete restrict,
  character text not null,   -- the glyph itself, e.g. '一'
  difficulty int not null default 1,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique_feature_id uuid not null references unique_features (id) on delete restrict,
  image_url text,   -- added by v2_add_photo_columns.sql; null on nearly every row
  emoji text        -- added by v2_add_emoji_column.sql; populated for 67 of 109 N5 kanji
);

create index kanji_language_category_idx
  on kanji (language_id, category_id);
create index kanji_unique_feature_idx
  on kanji (unique_feature_id);

-- --- A10. kanji_readings - the "letter" side of kanji ---------------------

create table kanji_readings (
  id uuid primary key default gen_random_uuid(),
  kanji_id uuid not null references kanji (id) on delete cascade,
  reading text not null,
  reading_type text not null default 'other'
    check (reading_type in ('onyomi', 'kunyomi', 'nanori', 'other')),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  romaji text   -- added by v2_add_kanji_reading_romaji.sql
);

create unique index kanji_readings_primary_idx
  on kanji_readings (kanji_id)
  where is_primary;
create index kanji_readings_kanji_type_idx
  on kanji_readings (kanji_id, reading_type);

-- --- A11. kanji_translations - the "word" side of kanji -------------------

create table kanji_translations (
  id uuid primary key default gen_random_uuid(),
  kanji_id uuid not null references kanji (id) on delete cascade,
  target_language_id uuid not null references languages (id) on delete cascade,
  translation text not null,   -- e.g. 'one, number one'
  notes text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index kanji_translations_primary_idx
  on kanji_translations (kanji_id, target_language_id)
  where is_primary;
create index kanji_translations_kanji_target_idx
  on kanji_translations (kanji_id, target_language_id);
create index kanji_translations_target_language_idx
  on kanji_translations (target_language_id);

-- --- A12. card-images storage bucket - added by v2_add_photo_columns.sql -
--     public bucket for hand-uploaded photos referenced by words/letters/
--     kanji.image_url. Public read so the app's anon key can load images
--     directly by URL, same "public reference content" reasoning as the
--     content tables' blanket read policies below. No write policy - images
--     are uploaded by hand via the Supabase dashboard, not by the app.

insert into storage.buckets (id, name, public)
values ('card-images', 'card-images', true)
on conflict (id) do nothing;

drop policy if exists "Public read access for card-images" on storage.objects;
create policy "Public read access for card-images"
  on storage.objects for select
  using (bucket_id = 'card-images');


-- =========================================================================
-- SECTION B: hardening triggers (denormalized language_id consistency)
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

create trigger words_language_matches_category
  before insert or update of language_id, category_id on words
  for each row execute procedure enforce_language_matches_category();

create trigger kanji_language_matches_category
  before insert or update of language_id, category_id on kanji
  for each row execute procedure enforce_language_matches_category();

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

create trigger letters_language_matches_category
  before insert or update of language_id, category_id, letter_type_id on letters
  for each row execute procedure enforce_letters_language_consistency();


-- =========================================================================
-- SECTION C: RLS + "anyone can read" policies on the 11 content tables
-- =========================================================================

do $$
declare
  t text;
begin
  foreach t in array array[
    'languages', 'categories', 'letter_types', 'letters', 'letter_translations',
    'words', 'word_translations', 'kanji', 'kanji_readings', 'kanji_translations',
    'unique_features'
  ]
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "Anyone can read %I" on %I for select using (true)', t, t);
  end loop;
end $$;


-- =========================================================================
-- SECTION D: per-user progress tables (one per content type)
-- =========================================================================

create table letter_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  language_id uuid not null references languages (id) on delete cascade,
  letter_id uuid not null references letters (id) on delete cascade,
  exposures int not null default 0,
  correct_count int not null default 0,
  accuracy numeric generated always as (
    case when exposures = 0 then 0 else round(correct_count::numeric / exposures, 4) end
  ) stored,
  last_seen timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, letter_id)
);

alter table letter_progress enable row level security;
create policy "Users manage own letter progress" on letter_progress for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index letter_progress_user_idx on letter_progress (user_id);

create table word_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  language_id uuid not null references languages (id) on delete cascade,
  word_id uuid not null references words (id) on delete cascade,
  exposures int not null default 0,
  correct_count int not null default 0,
  accuracy numeric generated always as (
    case when exposures = 0 then 0 else round(correct_count::numeric / exposures, 4) end
  ) stored,
  last_seen timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, word_id)
);

alter table word_progress enable row level security;
create policy "Users manage own word progress" on word_progress for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index word_progress_user_idx on word_progress (user_id);

create table kanji_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  language_id uuid not null references languages (id) on delete cascade,
  kanji_id uuid not null references kanji (id) on delete cascade,
  exposures int not null default 0,
  correct_count int not null default 0,
  accuracy numeric generated always as (
    case when exposures = 0 then 0 else round(correct_count::numeric / exposures, 4) end
  ) stored,
  last_seen timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, kanji_id)
);

alter table kanji_progress enable row level security;
create policy "Users manage own kanji progress" on kanji_progress for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index kanji_progress_user_idx on kanji_progress (user_id);


-- =========================================================================
-- SECTION E: Basics-tab lessons
-- =========================================================================

create table lessons (
  id uuid primary key default gen_random_uuid(),
  language_id uuid not null references languages (id) on delete cascade,
  key text not null,
  title text not null,
  subtitle text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  -- added by v2_add_lesson_type.sql - distinguishes the original curated
  -- reading lessons ("Fundamentals") from click-through "Practical Lessons"
  lesson_type text not null default 'fundamentals'
    check (lesson_type in ('fundamentals', 'practical')),
  unique (language_id, key)
);

create index lessons_language_idx
  on lessons (language_id, sort_order);

alter table lessons enable row level security;
create policy "Anyone can read lessons" on lessons for select using (true);

create table lesson_sections (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references lessons (id) on delete cascade,
  sort_order int not null default 0,
  heading text,
  body text not null,
  created_at timestamptz not null default now()
);

create index lesson_sections_lesson_idx
  on lesson_sections (lesson_id, sort_order);

alter table lesson_sections enable row level security;
create policy "Anyone can read lesson sections" on lesson_sections for select using (true);

-- --- E3. lesson_section_blanks - added by v2_add_lesson_blanks.sql - at
--     most one fill-in-the-blank exercise per lesson_sections row, backing
--     Practical Lessons' Test panel (BlankExercise/lib/lessonBlanks.ts).

create table lesson_section_blanks (
  id uuid primary key default gen_random_uuid(),
  lesson_section_id uuid not null references lesson_sections (id) on delete cascade,
  prompt_before text not null default '',
  prompt_after text not null default '',
  answer_kana text[] not null default '{}',
  answer_romaji text[] not null default '{}',
  decoy_words text[] not null default '{}',
  created_at timestamptz not null default now(),
  constraint lesson_section_blanks_one_per_section unique (lesson_section_id),
  constraint lesson_section_blanks_has_answer check (
    array_length(answer_kana, 1) > 0 or array_length(answer_romaji, 1) > 0
  )
);

create index lesson_section_blanks_section_idx
  on lesson_section_blanks (lesson_section_id);

alter table lesson_section_blanks enable row level security;
create policy "Anyone can read lesson section blanks" on lesson_section_blanks for select using (true);


-- =========================================================================
-- SECTION F: v1 tables - still actually used (users, bug_reports) or still
-- present-but-superseded (everything else here). These have NO creation
-- script anywhere in this repo's history (made directly via the Supabase
-- table editor) - reconstructed from AGENTS.md's documented columns,
-- best-effort. Verify against the live DB before treating this section as
-- exact.
-- =========================================================================

-- --- F1. users - still live, auto-provisioned on signup -------------------

create table users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  style_preference text,   -- for an onboarding flow that was never built; always null in practice
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- --- F2. bug_reports - still live, backs the "Report Bug" tab -------------

create table bug_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null,
  description text not null,
  email text,
  page text,
  user_id uuid,   -- no FK on purpose - a deleted account should never block/cascade a report
  status text not null default 'new' check (status in ('new', 'in_progress', 'resolved', 'wontfix'))
);

alter table bug_reports enable row level security;

-- Current live policy (tightened by bug_reports_require_login.sql from an
-- earlier anon-inclusive version) - only signed-in users can submit.
create policy "Only logged-in users can submit a bug report"
  on bug_reports for insert
  to authenticated
  with check (true);

-- Deliberately no select/update/delete policy - only readable via the
-- Supabase dashboard (service role bypasses RLS).

-- --- F3. letters_japanese - superseded by the v2 tree, left in place ------

create table letters_japanese (
  id uuid primary key default gen_random_uuid(),
  hiragana text,
  katakana text,
  romaji text,
  kanji text,
  has_kanji boolean not null default false,
  difficulty int,
  category text,
  tags text[] default '{}'
);

-- --- F4. words_japanese / words_english / words_chinese -------------------
--     Joined to each other, and to word_descriptions, by shared id - not a
--     real FK relationship, just a convention from the original design.

create table words_japanese (
  id uuid primary key default gen_random_uuid(),
  text text
);

create table words_english (
  id uuid primary key default gen_random_uuid(),
  text text
);

create table words_chinese (
  id uuid primary key default gen_random_uuid(),   -- unused by app code
  text text
);

-- --- F5. word_descriptions - joins to words_* by shared id ----------------

create table word_descriptions (
  id uuid primary key default gen_random_uuid(),
  description text,
  category text,
  difficulty int,
  tags text[] default '{}'   -- added late via add_tags_to_word_descriptions.sql
);

-- --- F6. user_progress - superseded by letter/word/kanji_progress above ---
--     item_id's original FK (to the old content_items table) was dropped
--     via drop_user_progress_item_fk.sql since it couldn't point at both
--     word_descriptions and letters_japanese at once - it has had no FK at
--     all since. self_report's exact original type isn't confirmed
--     anywhere (nothing has written to it in a long time); text is a
--     reasonable guess, not a certainty.

create table user_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  item_id uuid,           -- no FK - can point at word_descriptions.id or letters_japanese.id
  exposures int not null default 0,
  accuracy numeric,       -- weighted 0-1 ratio, not a raw count
  self_report text,       -- dead column - nothing writes this anymore
  last_seen timestamptz
);


-- =========================================================================
-- This file creates STRUCTURE ONLY. To make the v2 tree actually usable,
-- these small reference-data inserts still need to be run afterward (each
-- is a handful of rows, originally inline in the files named):
--   - languages: 'ja'/'Japanese', 'en'/'English'      (from v2_content_schema.sql)
--   - letter_types: 'hiragana'/'katakana' for 'ja'      (from v2_content_schema.sql)
--   - unique_features: 'kanji' for 'ja'                 (from v2_unique_features.sql)
-- Real content (letters/words/kanji/translations/lessons/bug reports) is
-- everything else in supabase/sql/*.sql and is NOT part of this file.
-- =========================================================================
