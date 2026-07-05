-- Lingrazul: youon (拗音) - contracted sounds, consonant + small ya/yu/yo.
-- All 33 standard combinations, plain + dakuten/handakuten bases together.
-- Same pattern as existing letters_japanese rows: one row per sound with
-- both hiragana and katakana forms (they're the same 33 sounds in either
-- script - there's no separate "hiragana-only" vs "katakana-only" set
-- here, unlike the loanword-only extended katakana sounds).
--
-- Run in the Supabase SQL editor.

insert into letters_japanese (hiragana, katakana, romaji, difficulty, category, tags) values
-- k-row
('きゃ', 'キャ', 'kya', 2, 'youon', '{"hiragana", "katakana", "intermediate"}'),
('きゅ', 'キュ', 'kyu', 2, 'youon', '{"hiragana", "katakana", "intermediate"}'),
('きょ', 'キョ', 'kyo', 2, 'youon', '{"hiragana", "katakana", "intermediate"}'),
-- s-row
('しゃ', 'シャ', 'sha', 2, 'youon', '{"hiragana", "katakana", "intermediate"}'),
('しゅ', 'シュ', 'shu', 2, 'youon', '{"hiragana", "katakana", "intermediate"}'),
('しょ', 'ショ', 'sho', 2, 'youon', '{"hiragana", "katakana", "intermediate"}'),
-- t-row
('ちゃ', 'チャ', 'cha', 2, 'youon', '{"hiragana", "katakana", "intermediate"}'),
('ちゅ', 'チュ', 'chu', 2, 'youon', '{"hiragana", "katakana", "intermediate"}'),
('ちょ', 'チョ', 'cho', 2, 'youon', '{"hiragana", "katakana", "intermediate"}'),
-- n-row
('にゃ', 'ニャ', 'nya', 2, 'youon', '{"hiragana", "katakana", "intermediate"}'),
('にゅ', 'ニュ', 'nyu', 2, 'youon', '{"hiragana", "katakana", "intermediate"}'),
('にょ', 'ニョ', 'nyo', 2, 'youon', '{"hiragana", "katakana", "intermediate"}'),
-- h-row
('ひゃ', 'ヒャ', 'hya', 2, 'youon', '{"hiragana", "katakana", "intermediate"}'),
('ひゅ', 'ヒュ', 'hyu', 2, 'youon', '{"hiragana", "katakana", "intermediate"}'),
('ひょ', 'ヒョ', 'hyo', 2, 'youon', '{"hiragana", "katakana", "intermediate"}'),
-- m-row
('みゃ', 'ミャ', 'mya', 2, 'youon', '{"hiragana", "katakana", "intermediate"}'),
('みゅ', 'ミュ', 'myu', 2, 'youon', '{"hiragana", "katakana", "intermediate"}'),
('みょ', 'ミョ', 'myo', 2, 'youon', '{"hiragana", "katakana", "intermediate"}'),
-- r-row
('りゃ', 'リャ', 'rya', 2, 'youon', '{"hiragana", "katakana", "intermediate"}'),
('りゅ', 'リュ', 'ryu', 2, 'youon', '{"hiragana", "katakana", "intermediate"}'),
('りょ', 'リョ', 'ryo', 2, 'youon', '{"hiragana", "katakana", "intermediate"}'),
-- g-row (dakuten base)
('ぎゃ', 'ギャ', 'gya', 2, 'youon', '{"hiragana", "katakana", "intermediate"}'),
('ぎゅ', 'ギュ', 'gyu', 2, 'youon', '{"hiragana", "katakana", "intermediate"}'),
('ぎょ', 'ギョ', 'gyo', 2, 'youon', '{"hiragana", "katakana", "intermediate"}'),
-- j-row (dakuten base)
('じゃ', 'ジャ', 'ja', 2, 'youon', '{"hiragana", "katakana", "intermediate"}'),
('じゅ', 'ジュ', 'ju', 2, 'youon', '{"hiragana", "katakana", "intermediate"}'),
('じょ', 'ジョ', 'jo', 2, 'youon', '{"hiragana", "katakana", "intermediate"}'),
-- b-row (dakuten base)
('びゃ', 'ビャ', 'bya', 2, 'youon', '{"hiragana", "katakana", "intermediate"}'),
('びゅ', 'ビュ', 'byu', 2, 'youon', '{"hiragana", "katakana", "intermediate"}'),
('びょ', 'ビョ', 'byo', 2, 'youon', '{"hiragana", "katakana", "intermediate"}'),
-- p-row (handakuten base)
('ぴゃ', 'ピャ', 'pya', 2, 'youon', '{"hiragana", "katakana", "intermediate"}'),
('ぴゅ', 'ピュ', 'pyu', 2, 'youon', '{"hiragana", "katakana", "intermediate"}'),
('ぴょ', 'ピョ', 'pyo', 2, 'youon', '{"hiragana", "katakana", "intermediate"}');
