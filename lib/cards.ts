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
export interface LetterCard extends DataCard {
  cardType: 'letter';
  hiragana: string;
  katakana: string;
  romaji: string;
  questionScript: 'hiragana' | 'katakana' | 'romaji';
  answerScript: 'hiragana' | 'katakana' | 'romaji';
}