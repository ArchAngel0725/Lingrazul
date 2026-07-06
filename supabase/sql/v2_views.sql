-- Lingrazul: reusable views on top of the v2 content tree.
--
-- letters_with_translations - joins letters to their script (letter_types),
-- category, own language, and EVERY translation they have
-- (letter_translations), plus the target language of each translation.
-- Deliberately NOT hardcoded to Japanese/English - it exposes both
-- language_code (the letter's own language) and target_language_code (the
-- translation's language) as plain columns, so any (source, target)
-- language pair works by filtering in the query, not by editing the view.
-- Kanji is intentionally excluded here - it lives in its own `kanji` table
-- with its own shape (readings + meanings), not this view.
--
-- One row per (letter, translation) pair:
--   - A letter with zero translations yet still appears once, with every
--     translation-related column null (left join) - missing content
--     doesn't make a letter disappear.
--   - A letter translated into more than one target language, or with more
--     than one sense into the same target language, appears more than once
--     - filter down to what's needed in the query (e.g. is_primary = true
--     for "the" translation into a specific target language).
--
-- Assumes v2_content_schema.sql has been run. For rows to actually show up
-- while testing, v2_seed_test_data.sql should be run too.
--
-- Run in the Supabase SQL editor.

drop view if exists letters_with_translations;

create view letters_with_translations as
select
  l.id as letter_id,
  l.character,
  lang.code as language_code,
  lang.name as language_name,
  lt.key as script,
  lt.label as script_label,
  c.key as category,
  c.label as category_label,
  l.difficulty,
  l.tags,
  tgt.code as target_language_code,
  tgt.name as target_language_name,
  ltr.transliteration,
  ltr.notes as translation_notes,
  ltr.is_primary as translation_is_primary
from letters l
join letter_types lt on lt.id = l.letter_type_id
join categories c on c.id = l.category_id
join languages lang on lang.id = l.language_id
left join letter_translations ltr on ltr.letter_id = l.id
left join languages tgt on tgt.id = ltr.target_language_id;


-- =========================================================================
-- Example usage - not part of the view itself, just showing how the same
-- view serves any language pair by filtering, not by changing the view:
--
-- All Japanese letters (hiragana + katakana together), primary romaji:
--   select * from letters_with_translations
--   where language_code = 'ja' and target_language_code = 'en'
--     and translation_is_primary = true
--   order by category, script, character;
--
-- Same Japanese letters, once French translations exist - no view change:
--   select * from letters_with_translations
--   where language_code = 'ja' and target_language_code = 'fr'
--     and translation_is_primary = true;
--
-- Every letter across every language, with all translations:
--   select * from letters_with_translations
--   order by language_code, category, script, character;
-- =========================================================================
