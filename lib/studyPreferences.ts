// studyPreferences.ts - Persists the Flash Cards screen's applied filters
// (word categories, letter categories, letter modes) so they survive
// leaving and returning to the tab, instead of silently resetting to
// "everything selected" every time (the previous behavior).
//
// Letter modes are stored as indexes into offline.tsx's LETTER_MODES array
// rather than the mode objects themselves - offline.tsx compares selected
// modes by reference (`selectedModes.includes(mode)`), so persisting plain
// objects and reloading them would produce look-alike-but-not-equal
// objects and silently break that comparison.

import AsyncStorage from '@react-native-async-storage/async-storage';

const WORD_CATEGORIES_KEY = 'lingrazul:studyWordCategories';
const LETTER_CATEGORIES_KEY = 'lingrazul:studyLetterCategories';
const MODE_INDEXES_KEY = 'lingrazul:studyModeIndexes';
const MAX_DIFFICULTY_KEY = 'lingrazul:studyMaxDifficulty';
const TAGS_KEY = 'lingrazul:studyTags';

async function loadStringArray(key: string): Promise<string[] | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function saveArray(key: string, value: unknown[]): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // best-effort - losing a persisted preference isn't worth surfacing an error
  }
}

export function loadStudyWordCategories(): Promise<string[] | null> {
  return loadStringArray(WORD_CATEGORIES_KEY);
}
export function saveStudyWordCategories(categories: string[]): Promise<void> {
  return saveArray(WORD_CATEGORIES_KEY, categories);
}

export function loadStudyLetterCategories(): Promise<string[] | null> {
  return loadStringArray(LETTER_CATEGORIES_KEY);
}
export function saveStudyLetterCategories(categories: string[]): Promise<void> {
  return saveArray(LETTER_CATEGORIES_KEY, categories);
}

export async function loadStudyModeIndexes(): Promise<number[] | null> {
  try {
    const raw = await AsyncStorage.getItem(MODE_INDEXES_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((n: unknown) => typeof n === 'number') : null;
  } catch {
    return null;
  }
}
export function saveStudyModeIndexes(indexes: number[]): Promise<void> {
  return saveArray(MODE_INDEXES_KEY, indexes);
}

// null means "never set" - offline.tsx treats that as "default to the
// highest difficulty found in the data" (i.e. no cap), same null-vs-empty
// distinction used for word categories.
export async function loadStudyMaxDifficulty(): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(MAX_DIFFICULTY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return typeof parsed === 'number' ? parsed : null;
  } catch {
    return null;
  }
}
export async function saveStudyMaxDifficulty(maxDifficulty: number): Promise<void> {
  try {
    await AsyncStorage.setItem(MAX_DIFFICULTY_KEY, JSON.stringify(maxDifficulty));
  } catch {
    // best-effort
  }
}

// Empty array means "no tag filter applied" - every selected tag must be
// present on a row's tags array (match ALL), so an empty selection is
// naturally "disregard tags" rather than "match nothing."
export function loadStudyTags(): Promise<string[] | null> {
  return loadStringArray(TAGS_KEY);
}
export function saveStudyTags(tags: string[]): Promise<void> {
  return saveArray(TAGS_KEY, tags);
}

// Clears every persisted Flash Cards filter - used by the "Reset flashcard
// filters" button in Settings so a confused/stuck state is one tap to undo.
export async function clearStudyPreferences(): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(WORD_CATEGORIES_KEY),
    AsyncStorage.removeItem(LETTER_CATEGORIES_KEY),
    AsyncStorage.removeItem(MODE_INDEXES_KEY),
    AsyncStorage.removeItem(MAX_DIFFICULTY_KEY),
    AsyncStorage.removeItem(TAGS_KEY),
  ]);
}
