// cardDisplay.ts - Shared "what text does this card show" helpers, used by
// both components/flashcardcomponent.tsx (rendering + grading taps) and
// app/(tabs)/offline.tsx (building the multiple-choice pool before the card
// ever renders) - previously each file had its own copy of this logic
// (getQuestion/getAnswer vs. offline.tsx's getCorrectAnswer), which was
// already a duplication risk before picture-quiz mode; centralizing it here
// means the two can't quietly disagree about what counts as correct.

import { FlashCard, LetterCard } from './cards';

// The term/reading this card is normally asking about.
export function getQuestionText(card: FlashCard | LetterCard): string {
  if (card.cardType === 'letter') {
    return card[card.questionScript as keyof LetterCard] as string;
  }
  return (card as FlashCard).learningLanguage;
}

// The term/reading that's normally graded as correct.
export function getAnswerText(card: FlashCard | LetterCard): string {
  if (card.cardType === 'letter') {
    return card[card.answerScript as keyof LetterCard] as string;
  }
  return (card as FlashCard).nativeLanguage;
}

// A letter/kanji card's kana reading, regardless of whatever script its
// current questionScript/answerScript mode happens to be - falls back to
// katakana for the (rare) katakana-only rows, same idiom already used by
// flashcardcomponent.tsx's getSpokenQuestion for the romaji/meaning TTS
// fallback. Every letters/kanji row has one of these populated.
export function getKanaText(card: LetterCard): string {
  return card.hiragana || card.katakana;
}

// True when this card should render as a picture-recognition quiz instead
// of its normal question/answer script pair - gated behind the "Enable
// pictures/emojis" setting (see preferences.tsx's showPictures) on top of
// the row actually having a photo or emoji. When this is true, the card's
// own term becomes the thing being tested (see getCorrectChoiceText below)
// instead of a translation/reading of it - there's little point asking
// "translate this word" once its picture is already on screen, so the
// question flips to "which word matches this picture" instead.
export function hasCardPicture(card: FlashCard | LetterCard, showPictures: boolean): boolean {
  return showPictures && (card.imageUrl != null || card.emoji != null);
}

// The text that counts as "correct" for this card's current display mode.
// In picture mode, a letter/kanji card is always tested in kana - never
// meaning, romaji, or the bare kanji glyph - regardless of which mode
// (e.g. 'meaning' <-> 'kanji') was actually rolled for that row. Word cards
// have no separate scripts/modes to normalize away, so their own term
// (learningLanguage) stands as-is.
export function getCorrectChoiceText(card: FlashCard | LetterCard, showPictures: boolean): string {
  if (!hasCardPicture(card, showPictures)) return getAnswerText(card);
  return card.cardType === 'letter' ? getKanaText(card) : getQuestionText(card);
}
