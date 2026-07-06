-- Lingrazul: fills in the gap deliberately left by v2_migrate_kanji_from_live.sql
-- - English meanings for the 109 JLPT N5 kanji, as kanji_translations rows
-- (target_language = English, is_primary = true).
--
-- The old letters_japanese table never had a meaning/definition field for
-- kanji at all (only a reading), so this isn't a migration of existing
-- data - it's fresh content, sourced the same way the original kanji list
-- was ("verified against a standard N5 reference list rather than
-- generated from memory"): cross-checked against JLPT Sensei's N5 kanji
-- reference (jlptsensei.com/jlpt-n5-kanji-list/), which covers ~80 of
-- these 109. The remaining ~29 (安/新/多/少/立/買/会/言/英/社/店/足/耳/力/
-- 道/駅/魚/肉, etc.) are common enough that they're given directly from
-- established knowledge rather than an extra source lookup.
--
-- `translation` is a single concise gloss (the meaning most useful for a
-- flashcard answer); `notes` adds secondary senses or usage context only
-- where that's genuinely useful, left null otherwise - not padded out for
-- its own sake.
--
-- Matches characters against the `kanji` table by (language_id,
-- character), so this must run AFTER v2_migrate_kanji_from_live.sql (which
-- is what actually creates those rows). Idempotent via the partial unique
-- index from the hardening pass (on conflict ... where is_primary do
-- nothing).
--
-- Run in the Supabase SQL editor.

insert into kanji_translations (kanji_id, target_language_id, translation, notes, is_primary)
select
  k.id,
  (select id from languages where code = 'en'),
  v.translation,
  v.notes,
  true
from (values
  -- Numbers and quantities
  ('一', 'one', null),
  ('二', 'two', null),
  ('三', 'three', null),
  ('四', 'four', null),
  ('五', 'five', null),
  ('六', 'six', null),
  ('七', 'seven', null),
  ('八', 'eight', null),
  ('九', 'nine', null),
  ('十', 'ten', null),
  ('百', 'hundred', null),
  ('千', 'thousand', null),
  ('万', 'ten thousand', null),
  ('円', 'yen', 'also "circle, round"'),
  ('半', 'half', null),
  -- Time and calendar
  ('日', 'day', 'also "sun"; used for Japan (日本) and day-of-month counters'),
  ('月', 'month', 'also "moon"'),
  ('火', 'fire', 'also the day name for Tuesday (火曜日)'),
  ('水', 'water', null),
  ('木', 'tree', 'also "wood"'),
  ('金', 'gold', 'also "money"; day name for Friday (金曜日)'),
  ('土', 'soil', 'also "earth, ground"; day name for Saturday (土曜日)'),
  ('年', 'year', null),
  ('時', 'time', 'also "hour"'),
  ('間', 'interval', 'also "space, between"'),
  ('分', 'minute', 'also "part"; can also mean "understand"'),
  ('今', 'now', null),
  ('毎', 'every', null),
  ('朝', 'morning', null),
  ('昼', 'noon', 'also "daytime"'),
  ('夜', 'night', null),
  ('午', 'noon', 'used in 午前 (a.m.) and 午後 (p.m.)'),
  ('前', 'before', 'also "in front"'),
  ('後', 'after', 'also "behind, later"'),
  ('週', 'week', null),
  -- People and relationships
  ('人', 'person', null),
  ('女', 'woman', 'also "female"'),
  ('男', 'man', 'also "male"'),
  ('子', 'child', null),
  ('友', 'friend', null),
  ('父', 'father', null),
  ('母', 'mother', null),
  ('先', 'previous', 'also "ahead, future"; as in 先生 "teacher"'),
  ('生', 'life', 'also "birth, raw, student" depending on the compound'),
  ('学', 'study', 'also "learning, science"'),
  -- Nature and places
  ('山', 'mountain', null),
  ('川', 'river', 'also "stream"'),
  ('天', 'heaven', 'also "sky"'),
  ('気', 'spirit', 'also "air, mood, atmosphere"'),
  ('雨', 'rain', null),
  ('花', 'flower', null),
  ('空', 'sky', 'also "empty"'),
  -- Directions and positions
  ('上', 'above', 'also "up"'),
  ('下', 'below', 'also "down"'),
  ('中', 'middle', 'also "inside, center"'),
  ('右', 'right', 'direction, not "correct"'),
  ('左', 'left', null),
  ('北', 'north', null),
  ('南', 'south', null),
  ('東', 'east', null),
  ('西', 'west', null),
  ('外', 'outside', null),
  ('国', 'country', null),
  -- Actions and verbs (dictionary form)
  ('食べる', 'to eat', null),
  ('飲む', 'to drink', null),
  ('見る', 'to see', 'also "to look at, to watch"'),
  ('聞く', 'to hear', 'also "to listen, to ask"'),
  ('読む', 'to read', null),
  ('書く', 'to write', null),
  ('話す', 'to speak', 'also "to talk"'),
  ('言う', 'to say', null),
  ('行く', 'to go', null),
  ('来る', 'to come', null),
  ('出る', 'to exit', 'also "to leave, to go out"'),
  ('入る', 'to enter', null),
  ('立つ', 'to stand', 'also "to rise"'),
  ('休む', 'to rest', 'also "to take a day off"'),
  ('会う', 'to meet', null),
  ('買う', 'to buy', null),
  -- Adjectives and concepts
  ('大きい', 'big', 'also "large"'),
  ('小さい', 'small', 'also "little"'),
  ('高い', 'tall', 'also "high, expensive"'),
  ('安い', 'cheap', null),
  ('新しい', 'new', null),
  ('古い', 'old', 'used for objects/things, not people''s age'),
  ('長い', 'long', null),
  ('多い', 'many', 'also "much"'),
  ('少ない', 'few', 'also "little (in amount)"'),
  ('白い', 'white', null),
  -- Objects, transport, and misc
  ('語', 'language', 'also "word, speech"'),
  ('英', 'England', 'used in 英語 "English language", 英国 "England/UK"'),
  ('車', 'car', 'also "vehicle, wheel"'),
  ('電', 'electricity', null),
  ('店', 'shop', 'also "store"'),
  ('社', 'company', 'also "shrine", as in 神社'),
  ('校', 'school', 'usually seen in compounds like 学校'),
  ('名', 'name', null),
  ('何', 'what', null),
  ('本', 'book', 'also "origin, main, true"; counter for long objects'),
  ('手', 'hand', null),
  ('足', 'foot', 'also "leg"; can also mean "sufficient"'),
  ('目', 'eye', null),
  ('口', 'mouth', null),
  ('耳', 'ear', null),
  ('力', 'power', 'also "strength"'),
  ('道', 'road', 'also "way, path"'),
  ('駅', 'station', null),
  ('魚', 'fish', null),
  ('肉', 'meat', null)
) as v(character, translation, notes)
join kanji k
  on k.character = v.character
  and k.language_id = (select id from languages where code = 'ja')
on conflict (kanji_id, target_language_id) where is_primary do nothing;
