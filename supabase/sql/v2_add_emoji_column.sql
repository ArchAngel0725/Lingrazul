-- Lingrazul: adds a free, zero-hosting stand-in for a card photo - a plain
-- Unicode emoji character - alongside the image_url column added in
-- v2_add_photo_columns.sql. There's no external image host set up for this
-- project yet, so most content won't get a real photo any time soon, but a
-- literal emoji (e.g. '🐱' for 猫) needs no upload/hosting at all and
-- renders natively on every platform via a plain <Text>.
--
-- Same nullable-everywhere design as image_url: added to all three
-- flashcardable content tables, left null on any row where neither a photo
-- nor an emoji is a literal depiction of the thing (grammar words,
-- adjectives, abstract kanji, kana letters) - the flashcard just renders
-- with no picture in that case, same as before either column existed.
-- lib/cards.ts / lib/cardCashe.ts / components/flashcardcomponent.tsx treat
-- image_url as taking priority over emoji when both happen to be set, so
-- adding a real photo later automatically replaces the emoji placeholder
-- with no further schema change.
--
-- Content itself (which rows get which emoji) is seeded separately in
-- v2_seed_word_emoji.sql and v2_seed_kanji_emoji.sql - this file is schema
-- only.
--
-- Safe to re-run - column add is idempotent.
--
-- Run in the Supabase SQL editor, after v2_add_photo_columns.sql.

alter table words add column if not exists emoji text;
alter table letters add column if not exists emoji text;
alter table kanji add column if not exists emoji text;
