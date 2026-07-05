-- Lingrazul: word_descriptions is missing the `tags` column that
-- letters_japanese already has (see the screenshot of letters_japanese's
-- tags like {"hiragana","katakana","beginner"} / {"kanji","n5"}). Without
-- this column, the Flash Cards screen's tag filter can never match a word
-- card - fetchFlashCards' `.contains('tags', tags)` filter would error on
-- a nonexistent column.
--
-- This only adds the column - it does NOT populate real tag values for
-- existing word rows. That's a separate content pass (someone needs to
-- decide what tags each word/particle/verb actually deserves), same as how
-- letters_japanese's tags were hand-authored per insert script.
--
-- Run in the Supabase SQL editor.

alter table word_descriptions add column if not exists tags text[] default '{}';

-- Backfill existing rows that predate the column (default only applies to
-- new rows going forward) so every row has an empty array instead of null -
-- fetchFilterOptions/fetchFlashCards both already tolerate null via `?? []`,
-- but a real empty array is cleaner to reason about in the DB itself.
update word_descriptions set tags = '{}' where tags is null;
