-- Lingrazul: per-content-type progress tracking, replacing the single
-- user_progress table (item_id with no FK, no content_type column - the
-- exact "one column pretending to be three different foreign keys"
-- problem already fixed on the content side). Real content already lives
-- in three tables (letters, words, kanji); progress now mirrors that
-- split - one table per content type, each with a REAL foreign key
-- instead of a loose id nothing enforces.
--
-- Starting fresh, NOT migrating the old user_progress table - its ids
-- don't match anything in the new letters/words/kanji tables anyway, so
-- there'd be nothing meaningful to carry over. user_progress itself is
-- left alone, untouched, same as every other old table.
--
-- self_report is dropped - AGENTS.md flags it as dead weight (nothing
-- writes it since the "too hard"/"too easy" buttons were removed from
-- the UI).
--
-- accuracy is a GENERATED column (correct_count / exposures) instead of a
-- manually-maintained running average - same pattern already used in
-- accounts_progress_community.sql's (unadopted) user_progress design.
-- Storing the raw correct_count and deriving accuracy avoids
-- floating-point drift from repeatedly recomputing a weighted average
-- client-side, and lets the app upsert with a plain increment instead of
-- reading the old average back out first.
--
-- RLS: unlike the public content tables, progress is PRIVATE per-user
-- data - each table gets a real "only your own rows" policy, not a
-- blanket read-everyone one like the content tables got in
-- v2_add_read_policies.sql.
--
-- Safe to re-run - drops and recreates.
--
-- Run in the Supabase SQL editor, after v2_content_schema.sql,
-- v2_unique_features.sql, and v2_schema_hardening.sql.


drop table if exists kanji_progress cascade;
drop table if exists word_progress cascade;
drop table if exists letter_progress cascade;


-- =========================================================================
-- 1. letter_progress
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

create policy "Users manage own letter progress"
  on letter_progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index letter_progress_user_idx on letter_progress (user_id);


-- =========================================================================
-- 2. word_progress
-- =========================================================================

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

create policy "Users manage own word progress"
  on word_progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index word_progress_user_idx on word_progress (user_id);


-- =========================================================================
-- 3. kanji_progress
-- =========================================================================

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

create policy "Users manage own kanji progress"
  on kanji_progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index kanji_progress_user_idx on kanji_progress (user_id);
