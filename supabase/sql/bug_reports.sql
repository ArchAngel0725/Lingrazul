-- Lingrazul: bug_reports table backing the "Report Bug" tab.
--
-- Only logged-in users can submit a report (guests are turned away by both
-- the app UI and this table's RLS policy - see below). Submission is also
-- gated behind a simple client-side human-check (a random math question +
-- a hidden honeypot field), not a real server-verified captcha, so that's
-- meant to stop casual/naive spam, not a determined attacker. This table
-- intentionally has NO select policy: nobody can read reports through the
-- anon/authenticated API keys the app uses - only the developer, browsing
-- via the Supabase dashboard (which uses the service role and bypasses RLS
-- entirely), can see submissions. That's the whole point - "the database
-- feeds me the problems," not a public feed.
--
-- Run in the Supabase SQL editor. If bug_reports already exists from an
-- earlier version of this script (the one that allowed anon inserts), run
-- supabase/sql/bug_reports_require_login.sql afterwards instead of this
-- whole file, since `create table if not exists` won't update the policy
-- on a table that already exists.

create table if not exists bug_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null,
  description text not null,
  email text,               -- optional, so the reporter can be followed up with
  page text,                -- optional, which tab/screen it happened on
  user_id uuid,             -- optional, set if the reporter was logged in - no FK,
                            -- same reasoning as user_progress.item_id: keep this
                            -- table decoupled from auth.users' lifecycle so a
                            -- deleted account never blocks/cascades a report.
  status text not null default 'new' check (status in ('new', 'in_progress', 'resolved', 'wontfix'))
);

alter table bug_reports enable row level security;

-- Only logged-in users can submit a report - guests get no insert
-- permission at all, enforced here rather than only in the app's UI.
create policy "Only logged-in users can submit a bug report"
  on bug_reports for insert
  to authenticated
  with check (true);

-- Deliberately no select/update/delete policy - the app never needs to read
-- these back, only the developer via the dashboard (service role).
