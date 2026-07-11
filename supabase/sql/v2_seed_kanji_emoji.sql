-- Lingrazul: curated emoji for `kanji` rows where the emoji is a literal
-- depiction of the character's meaning - see v2_add_emoji_column.sql for
-- why emoji exists at all (no external image host yet), and
-- v2_seed_word_emoji.sql for the same pass over the `words` table.
--
-- Hand-reviewed from a CSV dump of the live `kanji` table (109 N5 rows,
-- 2026-07-11). 67 of 109 get an emoji here; the rest are intentionally
-- left null because there's no honest single-glyph depiction of them:
--   - relational/positional: 中 (middle), 前/後 (before/after - also
--     ambiguous between spatial and temporal sense), 北/南/東/西 (compass
--     directions - arrows would collide with 上/下/右/左's arrows below and
--     add confusion, not clarity)
--   - abstract/grammatical: 何 (what), 先 (previous), 力 (power - "💪" would
--     be a metaphor, not a depiction), 今/午/半/分/時/間/週/年/毎 (time
--     units/relations), 天 (heaven), 気 (spirit), 語/英 (language names),
--     名 (name), 生 (life), 土 (soil - no clean icon)
--   - verbs with no clean literal icon or too ambiguous to distinguish from
--     a sibling row: する (to do, pure abstraction) and 来る (to come -
--     indistinguishable from 行く's "walking" icon, so skipped rather than
--     reuse it and imply both mean the same thing)
--   - adjectives (古い/多い/大きい/小さい/少ない/新しい/白い/高い/長い/安い) -
--     qualities, not objects; forcing an icon on these would be a stretch
--     the same way it would be for i-adjective/na-adjective words.
--
-- Matched by id (stable, from the live dump), not by character - add new
-- rows in a follow-up file rather than editing this one's existing values.
--
-- Idempotent - re-running just sets the same values again.
--
-- Run in the Supabase SQL editor, after v2_add_emoji_column.sql.

update kanji set emoji = v.emoji
from (values
  -- numbers
  ('f69bc56f-5e6d-45e9-9817-ca0878fe5566', '1️⃣'), -- 一 (one)
  ('38168ae1-a29d-4896-9bf6-2702093e9d3c', '2️⃣'), -- 二 (two)
  ('f49533c9-c8b8-479d-b0d5-c0e1b0f23cec', '3️⃣'), -- 三 (three)
  ('decf92b5-508a-4a5c-ab7c-ec0ee7ee5736', '4️⃣'), -- 四 (four)
  ('f8572974-11f2-49aa-bbf1-a167993589f9', '5️⃣'), -- 五 (five)
  ('b9f808b1-61b7-4fac-a5a5-504c520edca1', '6️⃣'), -- 六 (six)
  ('51ef71fc-5a35-4d88-b3c6-fa7e9547b951', '7️⃣'), -- 七 (seven)
  ('f3fe2cc8-736c-4874-ba2b-730f6ec592b8', '8️⃣'), -- 八 (eight)
  ('36b9e765-c26b-4617-9674-d9fc3f5cc0ac', '9️⃣'), -- 九 (nine)
  ('75836916-d1a2-4b01-bcca-12e4420d72fd', '🔟'), -- 十 (ten)
  ('0a8f9ddd-b186-4c79-9444-091ca94c28ff', '💯'), -- 百 (hundred)
  ('7fde9d46-a9e5-4c3a-bdb7-07d5cc5a79e4', '💴'), -- 円 (yen)
  -- position/direction (arrows only for the 4 that read unambiguously as
  -- one - compass points deliberately skipped, see file header)
  ('f8c4e0e7-d541-4bbe-a116-cf7be508a4ce', '⬆️'), -- 上 (above)
  ('85eb1620-4df2-4a13-8ded-f022bb8ca121', '⬇️'), -- 下 (below)
  ('006aad56-b4e4-4187-8e39-297bd8ba45c7', '👉'), -- 右 (right)
  ('f14372a3-2530-407d-9d38-a5234d86568e', '👈'), -- 左 (left)
  -- people/family
  ('d529e68b-5f7a-4696-b2e8-00cfe1511eb8', '🧑'), -- 人 (person)
  ('8b79e2c8-a51f-4482-8139-07ce7e02e465', '👩'), -- 女 (woman)
  ('318eca53-a932-4282-9c60-1210425a0d6c', '👨'), -- 男 (man)
  ('f1832a7b-e8c2-4625-90cf-8701cb3101e9', '🧒'), -- 子 (child)
  ('322f62c6-7c23-422f-9bcd-5ceec4bec5fe', '👨'), -- 父 (father)
  ('131476c0-71b7-4ee3-b84e-791a7ee8af80', '👩'), -- 母 (mother)
  ('aa70512c-367b-42db-b6bb-5136ea2f5f62', '🧑‍🤝‍🧑'), -- 友 (friend)
  -- body parts
  ('dfdc790b-69d5-4b17-8339-bfdad755a023', '✋'), -- 手 (hand)
  ('1838b33a-dd88-4a9c-8830-ef97e1917f68', '🦶'), -- 足 (foot)
  ('f3756c45-378c-4a9b-b586-4b783450ae0e', '👁️'), -- 目 (eye)
  ('294097c4-037f-4660-9322-e8086d7a6c3d', '👄'), -- 口 (mouth)
  ('e1feb1fe-3a30-49ae-8771-df181744e911', '👂'), -- 耳 (ear)
  -- nature
  ('8a8fc372-ef5b-40f0-8e6a-e59389cfce1e', '⛰️'), -- 山 (mountain)
  ('4f9e901f-e584-4c4e-83a8-385b026637a5', '🏞️'), -- 川 (river)
  ('c66bcccf-0619-4a88-abb3-cc32e1e19457', '🌳'), -- 木 (tree)
  ('50cab9d2-9567-4e45-9e91-8eedcbb385da', '💧'), -- 水 (water)
  ('b760015d-c796-4904-b67a-8562306b4e73', '🔥'), -- 火 (fire)
  ('1d18aac3-d86c-46e5-916b-885b470c8d2f', '☀️'), -- 日 (day/sun)
  ('e373de39-d376-4827-b3e6-8c424a526a49', '🌙'), -- 月 (month/moon)
  ('9be22aec-3789-455f-a6bc-7a550f9b44e3', '🪙'), -- 金 (gold)
  ('9fa1e15c-0cc7-40d6-9322-b28a02433250', '🌧️'), -- 雨 (rain)
  ('feb21a47-9e5c-45d9-a321-5c5ce7230c0f', '🌸'), -- 花 (flower)
  ('b96af33d-f661-4bd0-8e4c-dd1967af6e97', '☁️'), -- 空 (sky)
  -- animals/food
  ('156a5ca2-13ba-464b-a2ca-c0a7398e2315', '🐟'), -- 魚 (fish)
  ('c6c1b1d5-662b-430b-8f13-e459d6074cb9', '🍖'), -- 肉 (meat)
  -- places/buildings
  ('d8825a5a-0f96-4662-aef1-0e0cb79a0955', '📖'), -- 本 (book)
  ('306b8099-2782-4d7a-abe2-7de27c428e22', '🚗'), -- 車 (car)
  ('a61641bb-3dfa-404f-a03a-d500f802be3d', '🚉'), -- 駅 (station)
  ('fc767091-8d8b-4d60-a68b-aca61b1d4c47', '🏢'), -- 社 (company)
  ('70bb864d-f841-4a22-a0ce-5653f7791dcb', '🏪'), -- 店 (shop)
  ('001e2fad-b076-458c-b2d7-45f8e391af74', '🏫'), -- 校 (school)
  ('4706ac0b-a4be-435f-8538-0e833662d724', '🛣️'), -- 道 (road)
  ('6f831b67-bf93-4245-bf02-ad95a45272b1', '🌍'), -- 国 (country)
  -- time of day (concrete/visual sun-position, unlike abstract time units)
  ('1a4f0392-acdb-46b9-9197-9416ba73ed1a', '🌅'), -- 朝 (morning)
  ('547354f9-e543-4cb2-b56d-8e8b629da20b', '🌞'), -- 昼 (noon)
  ('3c3278a1-5dbc-40d5-877d-19e2c37596d3', '🌙'), -- 夜 (night)
  -- verbs (concrete/depict-able subset only, see file header)
  ('8c4d1598-086a-4f87-a5fb-8848df01b669', '🍽️'), -- 食べる (to eat)
  ('f132658a-7105-4561-9edf-0a9effc361ec', '🥤'), -- 飲む (to drink)
  ('37886062-6d14-463c-9b1a-3c364e7aa580', '👀'), -- 見る (to see)
  ('e9b03ef5-3a55-45d9-a2e4-ecc4fbb3f7eb', '👂'), -- 聞く (to hear)
  ('8ac4c6fd-9f52-436b-aa4f-13add0d8f5d4', '📖'), -- 読む (to read)
  ('98a41a04-15da-4aea-8110-b802a771548e', '✍️'), -- 書く (to write)
  ('889a80ab-7925-4ac0-868a-c4eb6fe4f8f8', '🗣️'), -- 話す (to speak)
  ('bde6b996-3cc5-4453-8f3d-1c6329c271f7', '💬'), -- 言う (to say)
  ('c1558d96-5e7e-497c-a400-9b4bb8e85b07', '🛍️'), -- 買う (to buy)
  ('9be01aaf-b3d4-49ee-bd38-61193edb8a98', '🚶'), -- 行く (to go)
  ('57c68e61-261d-44d0-b883-1329b29e1299', '🚪'), -- 出る (to exit)
  ('e48083fb-72bd-4722-9715-a0283f6217d6', '🚪'), -- 入る (to enter)
  ('43945827-a538-44f1-b1de-b0d20411c8ed', '🧍'), -- 立つ (to stand)
  ('cd4b35f2-0086-4999-a06e-e32072b4ce03', '😴'), -- 休む (to rest)
  ('6d8d3b73-6c19-44d1-9453-73da7c3bf752', '🤝')  -- 会う (to meet)
) as v(id, emoji)
where kanji.id = v.id::uuid;
