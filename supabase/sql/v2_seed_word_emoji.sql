-- Lingrazul: curated emoji for `words` rows where the emoji is a literal
-- depiction of the word, not a stretch/metaphor - see v2_add_emoji_column.sql
-- for why emoji exists at all (no external image host yet).
--
-- Scope, by category (from a hand-reviewed CSV dump of the live `words`
-- table, 2026-07-11):
--   - animals: every row gets one - the category is entirely concrete nouns.
--   - verb: only the physically depict-able daily actions (eat/drink/see/
--     hear/speak/read/buy/go). Deliberately skipped: する (to do), ある/いる
--     (to exist) and 来る (to come) - all four are too abstract/ambiguous to
--     draw as a single literal icon (来る in particular has no way to read
--     as visually distinct from 行く's "walking" icon).
--   - every other category (adverb, conjunction, demonstrative,
--     i-adjective, kosoado, na-adjective, particle, question, time) is
--     grammar/qualities/relations, not objects - intentionally left
--     entirely untouched (emoji stays null), matching the explicit
--     expectation that not everything can be pictured.
--
-- Matched by id (stable, from the live dump) rather than by text, since
-- text isn't unique/indexed for this purpose. If new animal words or new
-- concrete-verb words get added later, add them here by id in a follow-up,
-- don't edit this file's existing rows.
--
-- Idempotent - re-running just sets the same values again.
--
-- Run in the Supabase SQL editor, after v2_add_emoji_column.sql.

update words set emoji = v.emoji
from (values
  -- animals
  ('c07f8a26-cee5-4834-a13e-acb3d6926a7a', '🐰'), -- うさぎ (rabbit)
  ('05705d5c-0934-4c8e-ba63-bfc513e997bf', '🐼'), -- パンダ (panda)
  ('43cf4338-da1b-4299-b3be-c070544e916c', '🦁'), -- ライオン (lion)
  ('5cf46f33-c46c-4c5a-b66b-63af66a027c5', '🐻'), -- 熊 (bear)
  ('3ca4a8b6-c6ba-4150-b205-57dc8921acf7', '🐮'), -- 牛 (cow)
  ('4f5a6a8c-6c45-41cf-9341-c7f8e75a550a', '🐶'), -- 犬 (dog)
  ('213fe836-902a-472a-bf4a-dc8669b1a728', '🐱'), -- 猫 (cat)
  ('cb344657-f462-4091-a802-53d0c86cc233', '🐒'), -- 猿 (monkey)
  ('afa6fa01-efff-423b-b5f8-c777862bb073', '🐑'), -- 羊 (sheep)
  ('c8ac5393-5ce7-43bf-b97c-ceb4b9b7180a', '🐷'), -- 豚 (pig)
  ('ee0c0f6c-8464-4fb7-877d-ee1b44b8b850', '🐘'), -- 象 (elephant)
  ('4034a867-66fd-4b78-885f-e9293022f32d', '🐴'), -- 馬 (horse)
  ('6fc10f5e-5017-4bd3-8eb5-932bf3f266ff', '🐟'), -- 魚 (fish)
  ('46eb2ac4-55d0-402d-a0be-5b5662ecff7c', '🐦'), -- 鳥 (bird)
  -- verb (concrete/depict-able subset only)
  ('15b34cfd-7437-4923-a94a-08f8897cb8a6', '👂'), -- 聞く (to hear/listen)
  ('d88b498b-f805-42b7-8536-e7392177bde5', '🚶'), -- 行く (to go)
  ('58319a70-cabe-44cc-af37-801e42dcaaa5', '👀'), -- 見る (to see/watch/look)
  ('933c501a-e2bc-452b-ab01-74abf7c374f2', '🗣️'), -- 話す (to speak/talk)
  ('23e7c7d6-72b9-4f69-880f-4fe12dfb670a', '📖'), -- 読む (to read)
  ('016a6c23-1b53-42f9-b4ed-7c2b015a4c55', '🛍️'), -- 買う (to buy)
  ('7bff3e1a-7979-4eed-994f-667d37a94eb8', '🍽️'), -- 食べる (to eat)
  ('f52b51dd-8f12-468b-92e2-c175f5b0df1e', '🥤')  -- 飲む (to drink)
) as v(id, emoji)
where words.id = v.id::uuid;
