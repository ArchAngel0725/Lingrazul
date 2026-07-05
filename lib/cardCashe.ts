// ALark-Claude_Review@MEGADATA
import { supabase } from './supabase';
import { FlashCard, LetterCard, LetterScript } from './cards';

export interface FilterOptions {
  maxDifficulty: number;
  tags: string[];
}

// Live union of every tag + the highest difficulty value across both
// word_descriptions and letters_japanese. There's no fixed enum for either
// column (same reasoning as word categories in offline.tsx), so this reads
// the actual data every time rather than hardcoding a scale that could
// silently drift out of date as new rows get added.
export async function fetchFilterOptions(): Promise<FilterOptions> {
  const [{ data: wordRows }, { data: letterRows }] = await Promise.all([
    supabase.from('word_descriptions').select('difficulty,tags'),
    supabase.from('letters_japanese').select('difficulty,tags'),
  ]);

  const rows = [...(wordRows ?? []), ...(letterRows ?? [])];

  let maxDifficulty = 1;
  const tagSet = new Set<string>();
  for (const row of rows) {
    if (typeof row.difficulty === 'number' && row.difficulty > maxDifficulty) {
      maxDifficulty = row.difficulty;
    }
    for (const t of row.tags ?? []) {
      tagSet.add(t as string);
    }
  }

  return { maxDifficulty, tags: [...tagSet].sort() };
}
export async function fetchFlashCards(
  limit: number = 20,
  categories?: string[],
  maxDifficulty?: number,
  tags?: string[]
): Promise<FlashCard[]> {
  // Fetch random rows from word_descriptions
  let query = supabase
    .from('word_descriptions')
    .select('*')
    .limit(limit);

      // Filter by categories if provided
  if (categories && categories.length > 0) {
    query = query.in('category', categories);
  }

  // Cap by difficulty if a max was applied
  if (typeof maxDifficulty === 'number') {
    query = query.lte('difficulty', maxDifficulty);
  }

  // Match ALL selected tags (row's tags array must contain every one) -
  // an empty/undefined tags list disregards this filter entirely.
  if (tags && tags.length > 0) {
    query = query.contains('tags', tags);
  }

const { data: descriptions, error } = await query;
  if (error || !descriptions) {
    console.error('Failed to fetch descriptions:', error);
    return [];
  }

  // Get the IDs to fetch matching words
  const ids = descriptions.map(d => d.id);

  // Fetch matching japanese and english words
  const { data: japanese } = await supabase
    .from('words_japanese')
    .select('*')
    .in('id', ids);

  const { data: english } = await supabase
    .from('words_english')
    .select('*')
    .in('id', ids);

  if (!japanese || !english) return [];

  // Factory each description into a FlashCard
  const cards: FlashCard[] = descriptions.map(desc => {
    const jp = japanese.find(j => j.id === desc.id);
    const en = english.find(e => e.id === desc.id);

    return {
      id: desc.id,
      cardType: 'flash',
      difficulty: desc.difficulty,
      category: desc.category,
      language: 'ja',
      tags: desc.tags ?? [],
      learningLanguage: jp?.text ?? '',
      reading: '',
      nativeLanguage: en?.text ?? '',
    };
  });

  return cards;
}// ALark-Claude_Review@MEGADATA
// Fetches letter cards from letters_japanese table
// mode determines which script is shown as question and which is the answer
export async function fetchLetterCards(
  limit: number = 20,
  modes: { question: LetterScript, answer: LetterScript }[],
  categories?: string[],
  maxDifficulty?: number,
  tags?: string[]
): Promise<LetterCard[]> {
  let query = supabase
    .from('letters_japanese')
    .select('*')
    .limit(limit);

  if (categories && categories.length > 0) {
    query = query.in('category', categories);
  }

  if (typeof maxDifficulty === 'number') {
    query = query.lte('difficulty', maxDifficulty);
  }

  if (tags && tags.length > 0) {
    query = query.contains('tags', tags);
  }

  const { data, error } = await query;

  if (error || !data) {
    console.error('Failed to fetch letters:', error);
    return [];
  }

  // For each row pick a random mode from the enabled modes - but only from
  // modes that row can actually satisfy. A 'kanji' question/answer script
  // needs row.has_kanji to be true (and row.kanji populated); ordinary kana
  // rows don't have that, so a kanji-only mode selection would otherwise
  // leave nothing pickable. Rows that end up with zero compatible modes
  // (e.g. modes is empty, or every selected mode needs kanji on a
  // non-kanji row) are skipped rather than crashing on an undefined mode.
  const cards: LetterCard[] = data
    .map(row => {
      const compatibleModes = modes.filter(m =>
        (m.question !== 'kanji' || row.has_kanji) &&
        (m.answer !== 'kanji' || row.has_kanji)
      );
      if (compatibleModes.length === 0) return null;

      const mode = compatibleModes[Math.floor(Math.random() * compatibleModes.length)];
      return {
        id: row.id,
        cardType: 'letter' as const,
        difficulty: row.difficulty,
        category: row.category,
        language: 'ja',
        tags: row.tags ?? [],
        hiragana: row.hiragana,
        katakana: row.katakana,
        romaji: row.romaji,
        kanji: row.kanji ?? null,
        hasKanji: row.has_kanji ?? false,
        questionScript: mode.question,
        answerScript: mode.answer,
      };
    })
    .filter((c): c is LetterCard => c !== null);

  return cards;
}