-- Lingrazul: extended katakana (拡張仮名 / gairaigo sounds) - katakana-only
-- combinations used to transliterate foreign loanwords, built from a base
-- kana + small vowel (ぁぃぅぇぉ) rather than the small ya/yu/yo used by
-- youon. These have no natural native-Japanese hiragana equivalent, but
-- letters_japanese.hiragana is NOT NULL, so the hiragana column holds the
-- same small-kana construction applied to hiragana (valid to write, just
-- rarely used in practice) so every row stays consistent with the rest of
-- the table.
--
-- Run in the Supabase SQL editor.

insert into letters_japanese (hiragana, katakana, romaji, difficulty, category, tags) values
('ふぁ', 'ファ', 'fa', 3, 'katakana-extended', '{"katakana", "loanword", "advanced"}'),
('ふぃ', 'フィ', 'fi', 3, 'katakana-extended', '{"katakana", "loanword", "advanced"}'),
('ふぇ', 'フェ', 'fe', 3, 'katakana-extended', '{"katakana", "loanword", "advanced"}'),
('ふぉ', 'フォ', 'fo', 3, 'katakana-extended', '{"katakana", "loanword", "advanced"}'),
('てぃ', 'ティ', 'ti', 3, 'katakana-extended', '{"katakana", "loanword", "advanced"}'),
('でぃ', 'ディ', 'di', 3, 'katakana-extended', '{"katakana", "loanword", "advanced"}'),
('とぅ', 'トゥ', 'tu', 3, 'katakana-extended', '{"katakana", "loanword", "advanced"}'),
('どぅ', 'ドゥ', 'du', 3, 'katakana-extended', '{"katakana", "loanword", "advanced"}'),
('うぃ', 'ウィ', 'wi', 3, 'katakana-extended', '{"katakana", "loanword", "advanced"}'),
('うぇ', 'ウェ', 'we', 3, 'katakana-extended', '{"katakana", "loanword", "advanced"}'),
('うぉ', 'ウォ', 'wo', 3, 'katakana-extended', '{"katakana", "loanword", "advanced"}'),
('ゔぁ', 'ヴァ', 'va', 3, 'katakana-extended', '{"katakana", "loanword", "advanced"}'),
('ゔぃ', 'ヴィ', 'vi', 3, 'katakana-extended', '{"katakana", "loanword", "advanced"}'),
('ゔ', 'ヴ', 'vu', 3, 'katakana-extended', '{"katakana", "loanword", "advanced"}'),
('ゔぇ', 'ヴェ', 've', 3, 'katakana-extended', '{"katakana", "loanword", "advanced"}'),
('ゔぉ', 'ヴォ', 'vo', 3, 'katakana-extended', '{"katakana", "loanword", "advanced"}'),
('じぇ', 'ジェ', 'je', 3, 'katakana-extended', '{"katakana", "loanword", "advanced"}'),
('ちぇ', 'チェ', 'che', 3, 'katakana-extended', '{"katakana", "loanword", "advanced"}'),
('しぇ', 'シェ', 'she', 3, 'katakana-extended', '{"katakana", "loanword", "advanced"}'),
('つぁ', 'ツァ', 'tsa', 3, 'katakana-extended', '{"katakana", "loanword", "advanced"}'),
('つぃ', 'ツィ', 'tsi', 3, 'katakana-extended', '{"katakana", "loanword", "advanced"}'),
('つぇ', 'ツェ', 'tse', 3, 'katakana-extended', '{"katakana", "loanword", "advanced"}'),
('つぉ', 'ツォ', 'tso', 3, 'katakana-extended', '{"katakana", "loanword", "advanced"}');
