// languageConfig.ts - Per-language quirks the rest of the app dispatches
// through, instead of hardcoding 'ja'/hiragana-katakana-kanji assumptions
// wherever a TTS locale, particle override, or valid quiz-mode pair was
// needed. Today only Japanese is registered (LANGUAGE_CONFIGS has one
// entry) and nothing behaves any differently than before this file
// existed - this is scaffolding so a second language is "add a config
// object + seed its content in Supabase" instead of a grep-and-hope sweep
// through offline.tsx/cardCashe.ts/flashcardcomponent.tsx.
//
// What this does NOT solve: LetterCard's shape (hiragana/katakana/romaji/
// kanji as fixed fields - see cards.ts) is still Japanese-specific, and so
// is the LetterScript type. A language with a fundamentally different
// script system (e.g. only one script, or no romanization, or a
// unique-feature content type that isn't reading/meaning-shaped like
// kanji) will need that interface widened too - that's a data-shape
// change, out of scope here. This file only centralizes the *behavioral*
// differences that don't require one.

import { LetterScript } from './cards';

export interface LetterModePair {
  question: LetterScript;
  answer: LetterScript;
}

export interface LanguageConfig {
  code: string;
  label: string;
  // Locale string passed to expo-speech's Speech.speak(text, { language }).
  ttsLocale: string;
  // Random exclamations for the default "Announce Celebration" mode (see
  // preferences.tsx's AnnounceMode) - swapped out entirely per language
  // rather than translated in place, since a stock phrase in one language
  // usually isn't a natural word-for-word fit in another.
  celebrationPhrases: string[];
  // Text that's written one way but pronounced another when acting as a
  // grammatical particle (see flashcardcomponent.tsx's
  // PARTICLE_PRONUNCIATION_OVERRIDES). Empty object for languages with no
  // such quirk.
  particlePronunciationOverrides: Record<string, string>;
  // Every valid (question script, answer script) pair the Flash Cards
  // screen can quiz on for this language's letter/unique-feature cards -
  // replaces offline.tsx's hardcoded LETTER_MODES constant.
  letterModes: LetterModePair[];
  // The pseudo-category key the Letters panel treats as "the unique
  // feature, toggle-exclusive" (e.g. 'kanji' for Japanese - see
  // categories.ts/cardCashe.ts's existing 'kanji' pseudo-category
  // handling) - null if this language has no unique feature.
  uniqueFeatureCategoryKey: string | null;
}

const JAPANESE_CONFIG: LanguageConfig = {
  code: 'ja',
  label: 'Japanese',
  ttsLocale: 'ja',
  celebrationPhrases: [
    'すごい！', 'すごいね！', 'やるじゃん！', 'さすが！', 'かっこいい！',
    'やばい！', 'マジで！', 'うわあ！', 'いいね！', 'よくできました！',
    'その通り！', '正解！', '合ってる！', 'バッチリ！', '完璧！',
    'よし！', 'パーフェクト！', 'ナイス！', 'ブラボー！', '天才！',
    '神！', 'やるね！', 'さすがだね！', 'もちろん！', 'えらい！',
    'よかった！', '上手！', '頑張ったね！', '素晴らしい！', '最高！',
  ],
  particlePronunciationOverrides: {
    'は': 'わ', // topic marker, spoken "wa"
    'へ': 'え', // direction marker, spoken "e"
  },
  letterModes: [
    { question: 'hiragana', answer: 'romaji' },
    { question: 'katakana', answer: 'romaji' },
    { question: 'romaji', answer: 'hiragana' },
    { question: 'romaji', answer: 'katakana' },
    { question: 'hiragana', answer: 'katakana' },
    { question: 'katakana', answer: 'hiragana' },
    // Kanji-only modes - only satisfiable by rows with has_kanji (see
    // cardCashe.ts's per-row mode filtering).
    { question: 'kanji', answer: 'hiragana' },
    { question: 'kanji', answer: 'romaji' },
    { question: 'hiragana', answer: 'kanji' },
    // Meaning ("English translation of the kanji") is also kanji-only -
    // ordinary kana rows have no kanji_translations row to pull from (see
    // cardCashe.ts's CombinedLetterRow.meaning, '' for kana rows).
    { question: 'kanji', answer: 'meaning' },
    { question: 'meaning', answer: 'kanji' },
  ],
  uniqueFeatureCategoryKey: 'kanji',
};

export const LANGUAGE_CONFIGS: Record<string, LanguageConfig> = {
  ja: JAPANESE_CONFIG,
};

export const DEFAULT_LANGUAGE_CODE = 'ja';

// Falls back to the default language's config rather than throwing -
// callers pass in card.language / a persisted preference, either of which
// could in principle hold a code with no registered config (e.g. content
// briefly seeded ahead of its config landing); better to teach Japanese
// than to crash.
export function getLanguageConfig(code: string): LanguageConfig {
  return LANGUAGE_CONFIGS[code] ?? JAPANESE_CONFIG;
}
