-- Lingrazul: bug_reports table backing the "Report Bug" tab.
--
-- Anyone (logged in or guest) can submit a report - the app-side form gates
-- submission behind a simple client-side human-check (a random math
-- question + a hidden honeypot field), not a real server-verified captcha,
-- so this is meant to stop casual/naive spam, not a determined attacker.
-- Given that, this table intentionally has NO select policy: nobody can
-- read reports through the anon/authenticated API keys the app uses -
-- only the developer, browsing via the Supabase dashboard (which uses the
-- service role and bypasses RLS entirely), can see submissions. That's the
-- whole point - "the database feeds me the problems," not a public feed.
--
-- Run in the Supabase SQL editor.

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

-- Anyone (anon or authenticated) can submit a report.
create policy "Anyone can submit a bug report"
  on bug_reports for insert
  to anon, authenticated
  with check (true);

-- Deliberately no select/update/delete policy - the app never needs to read
-- these back, only the developer via the dashboard (service role).
