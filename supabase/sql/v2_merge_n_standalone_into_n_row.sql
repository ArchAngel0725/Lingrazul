-- Lingrazul: merges the 'n-standalone' letter category (ん/ン - the kana
-- that isn't part of a vowel-row pattern) into 'n-row' so it shows up
-- alongside な/に/ぬ/ね/の (and ナ/ニ/ヌ/ネ/ノ) instead of as its own
-- separate category toggle in the Flash Cards UI.
--
-- Re-points every `letters` row currently under 'n-standalone' at 'n-row'
-- (same language, so the enforce_letters_language_consistency trigger from
-- v2_schema_hardening.sql is satisfied automatically - both categories
-- belong to 'ja'), then deletes the now-empty 'n-standalone' category row.
-- The delete is guarded by a NOT EXISTS check, so it's a no-op (not an
-- error) if some other row still references it for any reason.
--
-- Safe to re-run - the update just matches zero rows the second time, and
-- the delete only fires once the category is actually empty.
--
-- Run in the Supabase SQL editor.

update letters
set category_id = (
  select c.id from categories c
  join languages l on l.id = c.language_id
  where c.key = 'n-row' and c.content_type = 'letter' and l.code = 'ja'
)
where category_id = (
  select c.id from categories c
  join languages l on l.id = c.language_id
  where c.key = 'n-standalone' and c.content_type = 'letter' and l.code = 'ja'
);

delete from categories c
using languages l
where c.language_id = l.id
  and l.code = 'ja'
  and c.content_type = 'letter'
  and c.key = 'n-standalone'
  and not exists (select 1 from letters where letters.category_id = c.id);
