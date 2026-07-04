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