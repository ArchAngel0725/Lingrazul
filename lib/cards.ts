export interface DataCard {
  id: string;
  cardType: string;
  difficulty: number;
  category: string;
  language: string;
  tags: string[];
}

export interface FlashCard extends DataCard {
  cardType: 'flash';
  learningLanguage: string;
  reading: string;
  nativeLanguage: string;
}
export type LetterScript = 'hiragana' | 'katakana' | 'romaji' | 'kanji';

export interface LetterCard extends DataCard {
  cardType: 'letter';
  hiragana: string;
  katakana: string;
  romaji: string;
  // null/false for ordinary kana rows - only kanji-category rows have these set.
  kanji: string | null;
  hasKanji: boolean;
  questionScript: LetterScript;
  answerScript: LetterScript;
}