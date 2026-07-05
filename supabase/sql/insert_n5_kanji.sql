-- Lingrazul: JLPT N5 kanji (~109 kanji, verified against a standard N5
-- reference list rather than generated from memory - kanji accuracy
-- matters too much to guess at scale).
--
-- Each kanji gets ONE row with ONE reading (not the full on'yomi +
-- kun'yomi set) - letters_japanese has a single hiragana/katakana/romaji
-- field per row, same shape used for kana, so this picks whichever single
-- reading is most commonly taught first for that kanji. Verbs are given in
-- their common dictionary-word form (e.g. 食べる/たべる) rather than the
-- bare kanji stem, since an isolated kun-yomi stem on its own isn't a
-- meaningful flashcard answer.
--
-- IMPORTANT: the app doesn't yet have a "kanji" question/answer script in
-- LetterCard / fetchLetterCards / FlashCardComponent - these rows will be
-- filterable by category but the kanji character itself won't be shown or
-- quizzed until that's wired up.
--
-- Run in the Supabase SQL editor.

insert into letters_japanese (hiragana, katakana, kanji, has_kanji, romaji, difficulty, category, tags) values
-- Numbers and quantities
('いち', 'イチ', '一', true, 'ichi', 4, 'kanji', '{"kanji", "n5"}'),
('に', 'ニ', '二', true, 'ni', 4, 'kanji', '{"kanji", "n5"}'),
('さん', 'サン', '三', true, 'san', 4, 'kanji', '{"kanji", "n5"}'),
('よん', 'ヨン', '四', true, 'yon', 4, 'kanji', '{"kanji", "n5"}'),
('ご', 'ゴ', '五', true, 'go', 4, 'kanji', '{"kanji", "n5"}'),
('ろく', 'ロク', '六', true, 'roku', 4, 'kanji', '{"kanji", "n5"}'),
('なな', 'ナナ', '七', true, 'nana', 4, 'kanji', '{"kanji", "n5"}'),
('はち', 'ハチ', '八', true, 'hachi', 4, 'kanji', '{"kanji", "n5"}'),
('きゅう', 'キュウ', '九', true, 'kyuu', 4, 'kanji', '{"kanji", "n5"}'),
('じゅう', 'ジュウ', '十', true, 'juu', 4, 'kanji', '{"kanji", "n5"}'),
('ひゃく', 'ヒャク', '百', true, 'hyaku', 4, 'kanji', '{"kanji", "n5"}'),
('せん', 'セン', '千', true, 'sen', 4, 'kanji', '{"kanji", "n5"}'),
('まん', 'マン', '万', true, 'man', 4, 'kanji', '{"kanji", "n5"}'),
('えん', 'エン', '円', true, 'en', 4, 'kanji', '{"kanji", "n5"}'),
('はん', 'ハン', '半', true, 'han', 4, 'kanji', '{"kanji", "n5"}'),
-- Time and calendar
('ひ', 'ヒ', '日', true, 'hi', 4, 'kanji', '{"kanji", "n5"}'),
('つき', 'ツキ', '月', true, 'tsuki', 4, 'kanji', '{"kanji", "n5"}'),
('ひ', 'ヒ', '火', true, 'hi', 4, 'kanji', '{"kanji", "n5"}'),
('みず', 'ミズ', '水', true, 'mizu', 4, 'kanji', '{"kanji", "n5"}'),
('き', 'キ', '木', true, 'ki', 4, 'kanji', '{"kanji", "n5"}'),
('きん', 'キン', '金', true, 'kin', 4, 'kanji', '{"kanji", "n5"}'),
('つち', 'ツチ', '土', true, 'tsuchi', 4, 'kanji', '{"kanji", "n5"}'),
('ねん', 'ネン', '年', true, 'nen', 4, 'kanji', '{"kanji", "n5"}'),
('とき', 'トキ', '時', true, 'toki', 4, 'kanji', '{"kanji", "n5"}'),
('あいだ', 'アイダ', '間', true, 'aida', 4, 'kanji', '{"kanji", "n5"}'),
('ふん', 'フン', '分', true, 'fun', 4, 'kanji', '{"kanji", "n5"}'),
('いま', 'イマ', '今', true, 'ima', 4, 'kanji', '{"kanji", "n5"}'),
('まい', 'マイ', '毎', true, 'mai', 4, 'kanji', '{"kanji", "n5"}'),
('あさ', 'アサ', '朝', true, 'asa', 4, 'kanji', '{"kanji", "n5"}'),
('ひる', 'ヒル', '昼', true, 'hiru', 4, 'kanji', '{"kanji", "n5"}'),
('よる', 'ヨル', '夜', true, 'yoru', 4, 'kanji', '{"kanji", "n5"}'),
('ご', 'ゴ', '午', true, 'go', 4, 'kanji', '{"kanji", "n5"}'),
('まえ', 'マエ', '前', true, 'mae', 4, 'kanji', '{"kanji", "n5"}'),
('あと', 'アト', '後', true, 'ato', 4, 'kanji', '{"kanji", "n5"}'),
('しゅう', 'シュウ', '週', true, 'shuu', 4, 'kanji', '{"kanji", "n5"}'),
-- People and relationships
('ひと', 'ヒト', '人', true, 'hito', 4, 'kanji', '{"kanji", "n5"}'),
('おんな', 'オンナ', '女', true, 'onna', 4, 'kanji', '{"kanji", "n5"}'),
('おとこ', 'オトコ', '男', true, 'otoko', 4, 'kanji', '{"kanji", "n5"}'),
('こ', 'コ', '子', true, 'ko', 4, 'kanji', '{"kanji", "n5"}'),
('とも', 'トモ', '友', true, 'tomo', 4, 'kanji', '{"kanji", "n5"}'),
('ちち', 'チチ', '父', true, 'chichi', 4, 'kanji', '{"kanji", "n5"}'),
('はは', 'ハハ', '母', true, 'haha', 4, 'kanji', '{"kanji", "n5"}'),
('さき', 'サキ', '先', true, 'saki', 4, 'kanji', '{"kanji", "n5"}'),
('せい', 'セイ', '生', true, 'sei', 4, 'kanji', '{"kanji", "n5"}'),
('がく', 'ガク', '学', true, 'gaku', 4, 'kanji', '{"kanji", "n5"}'),
-- Nature and places
('やま', 'ヤマ', '山', true, 'yama', 4, 'kanji', '{"kanji", "n5"}'),
('かわ', 'カワ', '川', true, 'kawa', 4, 'kanji', '{"kanji", "n5"}'),
('てん', 'テン', '天', true, 'ten', 4, 'kanji', '{"kanji", "n5"}'),
('き', 'キ', '気', true, 'ki', 4, 'kanji', '{"kanji", "n5"}'),
('あめ', 'アメ', '雨', true, 'ame', 4, 'kanji', '{"kanji", "n5"}'),
('はな', 'ハナ', '花', true, 'hana', 4, 'kanji', '{"kanji", "n5"}'),
('そら', 'ソラ', '空', true, 'sora', 4, 'kanji', '{"kanji", "n5"}'),
-- Directions and positions
('うえ', 'ウエ', '上', true, 'ue', 4, 'kanji', '{"kanji", "n5"}'),
('した', 'シタ', '下', true, 'shita', 4, 'kanji', '{"kanji", "n5"}'),
('なか', 'ナカ', '中', true, 'naka', 4, 'kanji', '{"kanji", "n5"}'),
('みぎ', 'ミギ', '右', true, 'migi', 4, 'kanji', '{"kanji", "n5"}'),
('ひだり', 'ヒダリ', '左', true, 'hidari', 4, 'kanji', '{"kanji", "n5"}'),
('きた', 'キタ', '北', true, 'kita', 4, 'kanji', '{"kanji", "n5"}'),
('みなみ', 'ミナミ', '南', true, 'minami', 4, 'kanji', '{"kanji", "n5"}'),
('ひがし', 'ヒガシ', '東', true, 'higashi', 4, 'kanji', '{"kanji", "n5"}'),
('にし', 'ニシ', '西', true, 'nishi', 4, 'kanji', '{"kanji", "n5"}'),
('そと', 'ソト', '外', true, 'soto', 4, 'kanji', '{"kanji", "n5"}'),
('くに', 'クニ', '国', true, 'kuni', 4, 'kanji', '{"kanji", "n5"}'),
-- Actions and verbs (dictionary form, since a bare kun-yomi stem isn't a meaningful answer)
('たべる', 'タベル', '食べる', true, 'taberu', 4, 'kanji', '{"kanji", "n5", "verb"}'),
('のむ', 'ノム', '飲む', true, 'nomu', 4, 'kanji', '{"kanji", "n5", "verb"}'),
('みる', 'ミル', '見る', true, 'miru', 4, 'kanji', '{"kanji", "n5", "verb"}'),
('きく', 'キク', '聞く', true, 'kiku', 4, 'kanji', '{"kanji", "n5", "verb"}'),
('よむ', 'ヨム', '読む', true, 'yomu', 4, 'kanji', '{"kanji", "n5", "verb"}'),
('かく', 'カク', '書く', true, 'kaku', 4, 'kanji', '{"kanji", "n5", "verb"}'),
('はなす', 'ハナス', '話す', true, 'hanasu', 4, 'kanji', '{"kanji", "n5", "verb"}'),
('いう', 'イウ', '言う', true, 'iu', 4, 'kanji', '{"kanji", "n5", "verb"}'),
('いく', 'イク', '行く', true, 'iku', 4, 'kanji', '{"kanji", "n5", "verb"}'),
('くる', 'クル', '来る', true, 'kuru', 4, 'kanji', '{"kanji", "n5", "verb"}'),
('でる', 'デル', '出る', true, 'deru', 4, 'kanji', '{"kanji", "n5", "verb"}'),
('はいる', 'ハイル', '入る', true, 'hairu', 4, 'kanji', '{"kanji", "n5", "verb"}'),
('たつ', 'タツ', '立つ', true, 'tatsu', 4, 'kanji', '{"kanji", "n5", "verb"}'),
('やすむ', 'ヤスム', '休む', true, 'yasumu', 4, 'kanji', '{"kanji", "n5", "verb"}'),
('あう', 'アウ', '会う', true, 'au', 4, 'kanji', '{"kanji", "n5", "verb"}'),
('かう', 'カウ', '買う', true, 'kau', 4, 'kanji', '{"kanji", "n5", "verb"}'),
-- Adjectives and concepts
('おおきい', 'オオキイ', '大きい', true, 'ookii', 4, 'kanji', '{"kanji", "n5", "adjective"}'),
('ちいさい', 'チイサイ', '小さい', true, 'chiisai', 4, 'kanji', '{"kanji", "n5", "adjective"}'),
('たかい', 'タカイ', '高い', true, 'takai', 4, 'kanji', '{"kanji", "n5", "adjective"}'),
('やすい', 'ヤスイ', '安い', true, 'yasui', 4, 'kanji', '{"kanji", "n5", "adjective"}'),
('あたらしい', 'アタラシイ', '新しい', true, 'atarashii', 4, 'kanji', '{"kanji", "n5", "adjective"}'),
('ふるい', 'フルイ', '古い', true, 'furui', 4, 'kanji', '{"kanji", "n5", "adjective"}'),
('ながい', 'ナガイ', '長い', true, 'nagai', 4, 'kanji', '{"kanji", "n5", "adjective"}'),
('おおい', 'オオイ', '多い', true, 'ooi', 4, 'kanji', '{"kanji", "n5", "adjective"}'),
('すくない', 'スクナイ', '少ない', true, 'sukunai', 4, 'kanji', '{"kanji", "n5", "adjective"}'),
('しろい', 'シロイ', '白い', true, 'shiroi', 4, 'kanji', '{"kanji", "n5", "adjective"}'),
-- Objects, transport, and misc
('ご', 'ゴ', '語', true, 'go', 4, 'kanji', '{"kanji", "n5"}'),
('えい', 'エイ', '英', true, 'ei', 4, 'kanji', '{"kanji", "n5"}'),
('くるま', 'クルマ', '車', true, 'kuruma', 4, 'kanji', '{"kanji", "n5"}'),
('でん', 'デン', '電', true, 'den', 4, 'kanji', '{"kanji", "n5"}'),
('みせ', 'ミセ', '店', true, 'mise', 4, 'kanji', '{"kanji", "n5"}'),
('しゃ', 'シャ', '社', true, 'sha', 4, 'kanji', '{"kanji", "n5"}'),
('こう', 'コウ', '校', true, 'kou', 4, 'kanji', '{"kanji", "n5"}'),
('な', 'ナ', '名', true, 'na', 4, 'kanji', '{"kanji", "n5"}'),
('なに', 'ナニ', '何', true, 'nani', 4, 'kanji', '{"kanji", "n5"}'),
('ほん', 'ホン', '本', true, 'hon', 4, 'kanji', '{"kanji", "n5"}'),
('て', 'テ', '手', true, 'te', 4, 'kanji', '{"kanji", "n5"}'),
('あし', 'アシ', '足', true, 'ashi', 4, 'kanji', '{"kanji", "n5"}'),
('め', 'メ', '目', true, 'me', 4, 'kanji', '{"kanji", "n5"}'),
('くち', 'クチ', '口', true, 'kuchi', 4, 'kanji', '{"kanji", "n5"}'),
('みみ', 'ミミ', '耳', true, 'mimi', 4, 'kanji', '{"kanji", "n5"}'),
('ちから', 'チカラ', '力', true, 'chikara', 4, 'kanji', '{"kanji", "n5"}'),
('みち', 'ミチ', '道', true, 'michi', 4, 'kanji', '{"kanji", "n5"}'),
('えき', 'エキ', '駅', true, 'eki', 4, 'kanji', '{"kanji", "n5"}'),
('さかな', 'サカナ', '魚', true, 'sakana', 4, 'kanji', '{"kanji", "n5"}'),
('にく', 'ニク', '肉', true, 'niku', 4, 'kanji', '{"kanji", "n5"}');
