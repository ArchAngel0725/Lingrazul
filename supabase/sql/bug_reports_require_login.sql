-- Lingrazul: restrict bug_reports submissions to logged-in users only.
--
-- Originally anon (guest) + authenticated could both insert. Now only
-- authenticated - a guest's Supabase client has no insert permission at
-- all, so this is enforced at the database level, not just hidden in the
-- app's UI (the app also gates the Report Bug screen behind login, but
-- that alone wouldn't stop someone from calling the insert API directly
-- as a guest).
--
-- Run this AFTER bug_reports.sql has already been run once. Safe to run
-- again if needed (drops and recreates the policy).

drop policy if exists "Anyone can submit a bug report" on bug_reports;

create policy "Only logged-in users can submit a bug report"
  on bug_reports for insert
  to authenticated
  with check (true);
