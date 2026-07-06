-- Lingrazul: adds "anyone can read" SELECT policies to every v2 content
-- table. Unlike letters_japanese/words_*/word_descriptions (no RLS at
-- all), Supabase enabled RLS on these new tables with zero policies -
-- which makes every query return an empty result set instead of an error,
-- so the app silently saw "no data" everywhere even though the migration
-- actually worked (confirmed via v2_diagnose_empty_results.sql: all rows
-- are really there).
--
-- This is public reference content with no per-user data in it, so a
-- blanket read-everyone policy is the right shape (same as the "Anyone can
-- read active lessons" pattern already used in
-- accounts_progress_community.sql) - there's no INSERT/UPDATE/DELETE
-- policy added here on purpose, since none of these tables should be
-- writable by the anon/authenticated client roles, only via the SQL
-- editor (service role bypasses RLS regardless).
--
-- Safe to re-run - each policy is dropped and recreated.
--
-- Run in the Supabase SQL editor.

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
    execute format('drop policy if exists "Anyone can read %I" on %I', t, t);
    execute format('create policy "Anyone can read %I" on %I for select using (true)', t, t);
  end loop;
end $$;
