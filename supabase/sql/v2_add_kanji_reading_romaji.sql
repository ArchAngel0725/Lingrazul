-- Lingrazul: adds the romanized reading (e.g. 'ichi' for 一) to
-- kanji_readings, which v2_migrate_kanji_from_live.sql didn't carry over -
-- the old letters_japanese.romaji column for kanji rows never made it into
-- the new schema anywhere. This was missed until actually wiring the app
-- up to v2: the live app has a working "kanji -> romaji" quiz mode
-- (LETTER_MODES in offline.tsx), which needs this to keep working.
--
-- Backfilled from the same recovered insert_n5_kanji.sql content used to
-- write v2_seed_kanji_meanings.sql (same 109 characters, same source), not
-- re-derived - romaji here is the exact value that was already live.
--
-- Safe to re-run - column add is idempotent, and the update only touches
-- rows matching the character list below.
--
-- Run in the Supabase SQL editor, after v2_migrate_kanji_from_live.sql.

alter table kanji_readings add column if not exists romaji text;

update kanji_readings kr
set romaji = v.romaji
from (values
  ('一', 'ichi'), ('二', 'ni'), ('三', 'san'), ('四', 'yon'), ('五', 'go'),
  ('六', 'roku'), ('七', 'nana'), ('八', 'hachi'), ('九', 'kyuu'), ('十', 'juu'),
  ('百', 'hyaku'), ('千', 'sen'), ('万', 'man'), ('円', 'en'), ('半', 'han'),
  ('日', 'hi'), ('月', 'tsuki'), ('火', 'hi'), ('水', 'mizu'), ('木', 'ki'),
  ('金', 'kin'), ('土', 'tsuchi'), ('年', 'nen'), ('時', 'toki'), ('間', 'aida'),
  ('分', 'fun'), ('今', 'ima'), ('毎', 'mai'), ('朝', 'asa'), ('昼', 'hiru'),
  ('夜', 'yoru'), ('午', 'go'), ('前', 'mae'), ('後', 'ato'), ('週', 'shuu'),
  ('人', 'hito'), ('女', 'onna'), ('男', 'otoko'), ('子', 'ko'), ('友', 'tomo'),
  ('父', 'chichi'), ('母', 'haha'), ('先', 'saki'), ('生', 'sei'), ('学', 'gaku'),
  ('山', 'yama'), ('川', 'kawa'), ('天', 'ten'), ('気', 'ki'), ('雨', 'ame'),
  ('花', 'hana'), ('空', 'sora'),
  ('上', 'ue'), ('下', 'shita'), ('中', 'naka'), ('右', 'migi'), ('左', 'hidari'),
  ('北', 'kita'), ('南', 'minami'), ('東', 'higashi'), ('西', 'nishi'), ('外', 'soto'),
  ('国', 'kuni'),
  ('食べる', 'taberu'), ('飲む', 'nomu'), ('見る', 'miru'), ('聞く', 'kiku'),
  ('読む', 'yomu'), ('書く', 'kaku'), ('話す', 'hanasu'), ('言う', 'iu'),
  ('行く', 'iku'), ('来る', 'kuru'), ('出る', 'deru'), ('入る', 'hairu'),
  ('立つ', 'tatsu'), ('休む', 'yasumu'), ('会う', 'au'), ('買う', 'kau'),
  ('大きい', 'ookii'), ('小さい', 'chiisai'), ('高い', 'takai'), ('安い', 'yasui'),
  ('新しい', 'atarashii'), ('古い', 'furui'), ('長い', 'nagai'), ('多い', 'ooi'),
  ('少ない', 'sukunai'), ('白い', 'shiroi'),
  ('語', 'go'), ('英', 'ei'), ('車', 'kuruma'), ('電', 'den'), ('店', 'mise'),
  ('社', 'sha'), ('校', 'kou'), ('名', 'na'), ('何', 'nani'), ('本', 'hon'),
  ('手', 'te'), ('足', 'ashi'), ('目', 'me'), ('口', 'kuchi'), ('耳', 'mimi'),
  ('力', 'chikara'), ('道', 'michi'), ('駅', 'eki'), ('魚', 'sakana'), ('肉', 'niku')
) as v(character, romaji)
join kanji k on k.character = v.character
  and k.language_id = (select id from languages where code = 'ja')
where kr.kanji_id = k.id
  and kr.is_primary = true;
