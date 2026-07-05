// categories.ts - Shared category lists used by both the Flash Cards
// screen (offline.tsx) and the Stats screen, so the two can't drift apart.
//
// Word categories are fetched live from word_descriptions in offline.tsx
// (the source of truth); WORD_CATEGORY_FALLBACK is only the initial value
// shown before that fetch resolves. Letter categories aren't stored
// anywhere queryable as a distinct list - letters_japanese rows don't
// carry a fixed enum - so this static list is the actual source of truth
// for which letter categories exist in the UI.

export const WORD_CATEGORY_FALLBACK = [
  'demonstrative',
  'kosoado',
  'particle',
  'verb',
];

export const LETTER_CATEGORIES = [
  'vowel', 'k-row', 's-row', 't-row', 'n-row',
  'h-row', 'm-row', 'y-row', 'r-row', 'w-row',
  'n-standalone', 'dakuten', 'handakuten',
  'youon', 'katakana-extended', 'kanji',
];
