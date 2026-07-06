-- Lingrazul: one-shot diagnostic - checks row counts AND RLS status for
-- every v2 table at once, to tell apart "the seed data isn't actually
-- there" from "RLS is silently filtering it out for the anon key" (RLS
-- with no policies returns zero rows, not an error - which looks
-- identical to "empty table" from the app's point of view).
--
-- Just run this and read the results - it doesn't change anything.

select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  (select count(*) from pg_policies p where p.tablename = c.relname) as policy_count,
  (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I', c.relname), false, true, '')))[1]::text::int as row_count
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in (
    'languages', 'content_types', 'categories', 'letter_types', 'letters',
    'letter_translations', 'words', 'word_translations', 'kanji',
    'kanji_readings', 'kanji_translations', 'unique_features'
  )
order by c.relname;
