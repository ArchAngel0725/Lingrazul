-- Lingrazul: optional-account schema (profiles, progress, sessions, community)
-- Written 2026-07-05. Run in the Supabase SQL editor against the same
-- project as letters_japanese / words_* / word_descriptions.
--
-- Design assumption: accounts are OPTIONAL. Every user - guest or not -
-- gets a real auth.users row via Supabase Anonymous Sign-ins, so every
-- table below just checks auth.uid() = user_id with no special-casing for
-- "logged in vs not." Community browsing is open to anyone (including
-- guests); creating/rating lessons requires a non-anonymous account.
--
-- REQUIRED DASHBOARD STEP (not SQL): enable Anonymous Sign-ins under
-- Authentication -> Sign In / Providers, or auth.users won't get an
-- is_anonymous flag and the checks below will always see "not anonymous."
-- Client side, a guest session starts with supabase.auth.signInAnonymously();
-- upgrading to a real account later is supabase.auth.updateUser({ email, password })
-- on that same session, which preserves auth.uid() - existing rows below
-- just keep working, no migration needed.


-- =========================================================================
-- 1. profiles - one row per auth.users row, holding app-specific fields
--    that don't belong on the auth table itself.
-- =========================================================================

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  learning_language text not null default 'ja', -- ja now; words_chinese exists for later
  is_anonymous boolean not null default false,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row the moment a new auth.users row appears
-- (guest or real signup) so the app never has to do this manually.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, is_anonymous)
  values (new.id, coalesce(new.is_anonymous, false));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- =========================================================================
-- 2. user_progress - per-user, per-item tracking. Powers the adaptive
--    algorithm and the stats screen. content_type disambiguates which
--    source table item_id points into, since letters_japanese and
--    word_descriptions are separate id spaces.
-- =========================================================================

create table user_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  content_type text not null check (content_type in ('letter', 'word')),
  item_id uuid not null, -- references letters_japanese.id or word_descriptions.id depending on content_type
  exposures int not null default 0,
  correct_count int not null default 0,
  -- accuracy is derived, not written directly by the client
  accuracy numeric generated always as (
    case when exposures = 0 then 0 else round(correct_count::numeric / exposures, 4) end
  ) stored,
  last_seen timestamptz,
  -- maps to the "Too hard" / "Too easy" flashcard buttons (onNoIdea / onKnow)
  self_report text check (self_report in ('too_hard', 'too_easy')),
  updated_at timestamptz not null default now(),
  unique (user_id, content_type, item_id)
);

alter table user_progress enable row level security;

create policy "Users manage own progress"
  on user_progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index user_progress_user_id_idx on user_progress (user_id);


-- =========================================================================
-- 3. sessions - session history for the stats screen (duration, items seen).
-- =========================================================================

create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  items_seen int not null default 0,
  duration_seconds int,
  created_at timestamptz not null default now()
);

alter table sessions enable row level security;

create policy "Users manage own sessions"
  on sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index sessions_user_id_idx on sessions (user_id, started_at desc);


-- =========================================================================
-- 4. lessons - community-contributed lessons. Readable by anyone
--    (guests included); only non-anonymous accounts can create one.
-- =========================================================================

create table lessons (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  difficulty_stars int not null default 1 check (difficulty_stars between 1 and 5),
  content_json jsonb not null,
  status text not null default 'active' check (status in ('active', 'removed')),
  created_at timestamptz not null default now()
);

alter table lessons enable row level security;

create policy "Anyone can read active lessons"
  on lessons for select
  using (status = 'active');

create policy "Non-anonymous users can create lessons"
  on lessons for insert
  with check (
    auth.uid() = creator_id
    and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  );

create policy "Creators can update own lessons"
  on lessons for update
  using (auth.uid() = creator_id);

create index lessons_status_idx on lessons (status);


-- =========================================================================
-- 5. lesson_ratings - one like + optional improvement delta per user per
--    lesson. Reading is open to anyone; writing requires a real account.
-- =========================================================================

create table lesson_ratings (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references lessons (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  liked boolean not null default false,
  improvement_delta numeric,
  created_at timestamptz not null default now(),
  unique (lesson_id, user_id) -- one rating per user per lesson, no downvote stacking
);

alter table lesson_ratings enable row level security;

create policy "Anyone can read ratings"
  on lesson_ratings for select
  using (true);

create policy "Non-anonymous users can rate"
  on lesson_ratings for insert
  with check (
    auth.uid() = user_id
    and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  );

create policy "Users can update own rating"
  on lesson_ratings for update
  using (auth.uid() = user_id);


-- =========================================================================
-- 6. lesson_stats - aggregate ranking numbers. Read-only to clients; a
--    trigger keeps it in sync whenever a rating is inserted or changed, so
--    the client never writes here directly (weighted score = likes*0.4 +
--    avg_improvement*0.6, per the construct plan's ranking engine).
-- =========================================================================

create table lesson_stats (
  lesson_id uuid primary key references lessons (id) on delete cascade,
  total_likes int not null default 0,
  avg_improvement numeric not null default 0,
  exposure_count int not null default 0,
  updated_at timestamptz not null default now()
);

alter table lesson_stats enable row level security;

create policy "Anyone can read lesson stats"
  on lesson_stats for select
  using (true);

create function public.recalculate_lesson_stats()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  target_lesson_id uuid := coalesce(new.lesson_id, old.lesson_id);
begin
  insert into public.lesson_stats (lesson_id, total_likes, avg_improvement, updated_at)
  select
    target_lesson_id,
    count(*) filter (where liked),
    coalesce(avg(improvement_delta), 0),
    now()
  from public.lesson_ratings
  where lesson_id = target_lesson_id
  on conflict (lesson_id) do update set
    total_likes = excluded.total_likes,
    avg_improvement = excluded.avg_improvement,
    updated_at = excluded.updated_at;
  return new;
end;
$$;

create trigger on_lesson_rating_changed
  after insert or update or delete on lesson_ratings
  for each row execute procedure public.recalculate_lesson_stats();


-- =========================================================================
-- 7. copyright_claims - public takedown form. Anyone can submit (no
--    account required, matching the construct plan); nobody can read
--    others' submitted claims back through the client.
-- =========================================================================

create table copyright_claims (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references lessons (id) on delete cascade,
  claimant_name text not null,
  claimant_email text not null,
  reason text not null,
  attested boolean not null default false,
  created_at timestamptz not null default now()
);

alter table copyright_claims enable row level security;

create policy "Anyone can submit an attested copyright claim"
  on copyright_claims for insert
  with check (attested = true);

-- Submission immediately removes the lesson (construct plan: "Submission
-- immediately removes lesson and logs claim").
create function public.handle_copyright_claim()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.lessons set status = 'removed' where id = new.lesson_id;
  return new;
end;
$$;

create trigger on_copyright_claim_submitted
  after insert on copyright_claims
  for each row execute procedure public.handle_copyright_claim();
