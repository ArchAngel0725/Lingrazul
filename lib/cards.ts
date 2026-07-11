export interface DataCard {
  id: string;
  cardType: string;
  difficulty: number;
  category: string;
  language: string;
  tags: string[];
  // Null when the row has no photo (most rows) - only a subset of
  // flashcardable content has an image worth showing (e.g. concrete word
  // categories like animals/food), so this is opt-in per row, not required.
  imageUrl: string | null;
  // Cheap stand-in for imageUrl on rows that have no real photo uploaded -
  // a literal Unicode emoji (e.g. '🐱' for 猫), rendered as large text
  // instead of an <Image>. imageUrl wins if both are set. Like imageUrl,
  // most rows (grammar words, abstract kanji, adjectives) leave this null.
  emoji: string | null;
}

export interface FlashCard extends DataCard {
  cardType: 'flash';
  learningLanguage: string;
  reading: string;
  nativeLanguage: string;
}
export type LetterScript = 'hiragana' | 'katakana' | 'romaji' | 'kanji' | 'meaning';

export interface LetterCard extends DataCard {
  cardType: 'letter';
  hiragana: string;
  katakana: string;
  romaji: string;
  // null/false for ordinary kana rows - only kanji-category rows have these set.
  kanji: string | null;
  // '' for ordinary kana rows, same reasoning/pattern as katakana above -
  // only kanji rows have a kanji_translations meaning to show. Kept as a
  // plain string (not null) like the other script fields so
  // `card[questionScript]`-style generic indexing (see
  // flashcardcomponent.tsx's getQuestion/getAnswer) stays type-safe.
  meaning: string;
  hasKanji: boolean;
  questionScript: LetterScript;
  answerScript: LetterScript;
}