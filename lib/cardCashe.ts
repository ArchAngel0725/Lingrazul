// ALark-Claude_Review@MEGADATA
//
// Reads from the v2 content tree (languages/categories/words/
// word_translations/letters/letter_translations/letter_types/kanji/
// kanji_readings/kanji_translations) instead of the old
// letters_japanese/words_japanese/words_english/word_descriptions tables.
// Those old tables are untouched and still exist - this file just no
// longer reads from them.
//
// FAIRNESS FIX: the old version ran one query per fetch
// (`.from(table).select('*').in('category', categories).limit(limit)`)
// with no explicit ordering. Postgres/PostgREST returns rows in whatever
// order it happens to store them in when there's no `order by` - in
// practice that's roughly insertion order, so rows cluster by category
// (all of one category's rows together, then the next). A plain `.limit()`
// on top of that just grabs the first N rows it finds, which in practice
// meant the first category (or two) with enough rows filled the entire
// limit and every other selected category never got a look-in.
//
// The fix: fetch each selected category SEPARATELY, shuffle each
// category's full result client-side, and take a fair per-category share
// (`ceil(limit / number of categories)`) - so every selected category is
// guaranteed to contribute rows, not just whichever one Postgres happened
// to return first. The pools are then combined and shuffled again so the
// final order isn't grouped by category either. See lib/random.ts for the
// actual shuffle (a real Fisher-Yates, not the biased `sort(() => Math.random() - 0.5)`
// pattern used elsewhere in this codebase).

import { supabase } from './supabase';
import { shuffle } from './random';
import { FlashCard, LetterCard, LetterScript } from './cards';

export interface FilterOptions {
  maxDifficulty: number;
  tags: string[];
}

// languages.id barely ever needs re-fetching (the row never changes during
// a session) - a tiny module-level cache avoids a round trip on every card
// pull.
const languageIdCache = new Map<string, string>();
async function getLanguageId(code: string): Promise<string | null> {
  const cached = languageIdCache.get(code);
  if (cached) return cached;

  const { data, error } = await supabase.from('languages').select('id').eq('code', code).maybeSingle();
  if (error || !data) {
    console.error(`Failed to look up language "${code}":`, error);
    return null;
  }
  languageIdCache.set(code, data.id);
  return data.id;
}

// Live union of every tag + the highest difficulty value across words,
// letters, and kanji. There's no fixed enum for either column, so this
// reads the actual data every time rather than hardcoding a scale that
// could silently drift out of date as new rows get added.
export async function fetchFilterOptions(): Promise<FilterOptions> {
  const jaId = await getLanguageId('ja');
  if (!jaId) return { maxDifficulty: 1, tags: [] };

  const [{ data: wordRows }, { data: letterRows }, { data: kanjiRows }] = await Promise.all([
    supabase.from('words').select('difficulty,tags').eq('language_id', jaId),
    supabase.from('letters').select('difficulty,tags').eq('language_id', jaId),
    supabase.from('kanji').select('difficulty,tags').eq('language_id', jaId),
  ]);

  const rows = [...(wordRows ?? []), ...(letterRows ?? []), ...(kanjiRows ?? [])];

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
  const activeCategories = categories && categories.length > 0 ? categories : [];
  if (activeCategories.length === 0) return [];

  const jaId = await getLanguageId('ja');
  const enId = await getLanguageId('en');
  if (!jaId || !enId) return [];

  // Fair per-category share - see file header.
  const perCategory = Math.max(1, Math.ceil(limit / activeCategories.length));

  const pools = await Promise.all(activeCategories.map(async (catKey) => {
    let query = supabase
      .from('words')
      .select('id, text, difficulty, tags, categories!inner(key), word_translations(translation, is_primary, target_language_id)')
      .eq('language_id', jaId)
      .eq('categories.key', catKey);

    if (typeof maxDifficulty === 'number') query = query.lte('difficulty', maxDifficulty);
    if (tags && tags.length > 0) query = query.contains('tags', tags);

    const { data, error } = await query;
    if (error || !data) {
      console.error(`Failed to fetch words for category "${catKey}":`, error);
      return [];
    }
    return shuffle(data).slice(0, perCategory);
  }));

  const rows = shuffle(pools.flat());

  const cards: FlashCard[] = rows.map((row: any) => {
    const translations = (row.word_translations ?? []).filter(
      (t: any) => t.target_language_id === enId
    );
    const primary = translations.find((t: any) => t.is_primary) ?? translations[0];

    return {
      id: row.id,
      cardType: 'flash',
      difficulty: row.difficulty,
      category: row.categories?.key ?? '',
      language: 'ja',
      tags: row.tags ?? [],
      learningLanguage: row.text,
      reading: '',
      nativeLanguage: primary?.translation ?? '',
    };
  });

  return cards;
}

// Common shape both kana pairs and kanji rows get normalized into before
// mode selection, matching the combined hiragana+katakana+romaji+kanji
// row shape LetterCard/FlashCardComponent already expect (see cards.ts) -
// this keeps the rest of the app (FlashCardComponent's script-keyed field
// access) unchanged even though the underlying tables split those apart.
interface CombinedLetterRow {
  id: string;
  hiragana: string;
  katakana: string;
  romaji: string;
  kanji: string | null;
  hasKanji: boolean;
  difficulty: number;
  category: string;
  tags: string[];
}

// Re-pairs v2's separate hiragana/katakana rows (see letter_types) back
// into one combined row per sound, matched by shared romaji within this
// category. Matching by romaji (rather than, say, insertion order) is
// intentional: it's the one value the migration guaranteed identical on
// both a kana pair's rows, since both came from the same original
// letters_japanese row's single romaji column. Two DIFFERENT sounds within
// the SAME category never share identical romaji in the actual kana data
// (the well-known romaji collisions like じ/ぢ both being "ji" only happen
// ACROSS different categories), so this is safe in practice, not just in
// theory - but it is a real assumption, not an enforced constraint.
async function fetchKanaRowsForCategory(
  catKey: string,
  jaId: string,
  enId: string,
  maxDifficulty?: number,
  tags?: string[]
): Promise<CombinedLetterRow[]> {
  let query = supabase
    .from('letters')
    .select('id, character, difficulty, tags, letter_types(key), categories!inner(key), letter_translations(transliteration, is_primary, target_language_id)')
    .eq('language_id', jaId)
    .eq('categories.key', catKey);

  if (typeof maxDifficulty === 'number') query = query.lte('difficulty', maxDifficulty);
  if (tags && tags.length > 0) query = query.contains('tags', tags);

  const { data, error } = await query;
  if (error || !data) {
    console.error(`Failed to fetch letters for category "${catKey}":`, error);
    return [];
  }

  const byRomaji = new Map<string, { hiragana?: any; katakana?: any }>();
  for (const row of data as any[]) {
    const translations = (row.letter_translations ?? []).filter(
      (t: any) => t.target_language_id === enId
    );
    const primary = translations.find((t: any) => t.is_primary) ?? translations[0];
    const romaji = primary?.transliteration ?? `__no_romaji_${row.id}`; // unique fallback so un-translated rows don't collapse into one bucket
    const scriptKey = row.letter_types?.key;

    const bucket = byRomaji.get(romaji) ?? {};
    if (scriptKey === 'hiragana') bucket.hiragana = row;
    else if (scriptKey === 'katakana') bucket.katakana = row;
    byRomaji.set(romaji, bucket);
  }

  const combined: CombinedLetterRow[] = [];
  for (const [romaji, pair] of byRomaji) {
    const base = pair.hiragana ?? pair.katakana;
    if (!base) continue;
    combined.push({
      id: base.id,
      hiragana: pair.hiragana?.character ?? '',
      katakana: pair.katakana?.character ?? '',
      romaji: romaji.startsWith('__no_romaji_') ? '' : romaji,
      kanji: null,
      hasKanji: false,
      difficulty: base.difficulty,
      category: catKey,
      tags: base.tags ?? [],
    });
  }
  return combined;
}

// 'kanji' is a UI pseudo-category (see categories.ts) covering the whole
// kanji table for the language, regardless of JLPT-level sub-category
// (there's no per-level toggle in the UI today, same as before the v2
// migration) - difficulty/tags filters still narrow it further.
async function fetchKanjiRows(
  jaId: string,
  enId: string,
  maxDifficulty?: number,
  tags?: string[]
): Promise<CombinedLetterRow[]> {
  let query = supabase
    .from('kanji')
    .select('id, character, difficulty, tags, kanji_readings(reading, romaji, is_primary), kanji_translations(translation, is_primary, target_language_id)')
    .eq('language_id', jaId);

  if (typeof maxDifficulty === 'number') query = query.lte('difficulty', maxDifficulty);
  if (tags && tags.length > 0) query = query.contains('tags', tags);

  const { data, error } = await query;
  if (error || !data) {
    console.error('Failed to fetch kanji:', error);
    return [];
  }

  return (data as any[]).map(row => {
    const readings = row.kanji_readings ?? [];
    const primaryReading = readings.find((r: any) => r.is_primary) ?? readings[0];
    const translations = (row.kanji_translations ?? []).filter(
      (t: any) => t.target_language_id === enId
    );
    const primaryTranslation = translations.find((t: any) => t.is_primary) ?? translations[0];

    return {
      id: row.id,
      hiragana: primaryReading?.reading ?? '',
      katakana: '', // kanji rows never had a katakana form in the old schema either
      romaji: primaryReading?.romaji ?? '',
      kanji: row.character,
      hasKanji: true,
      difficulty: row.difficulty,
      category: 'kanji',
      // English meaning isn't surfaced as a quiz script today (no
      // "kanji -> meaning" mode exists in LETTER_MODES) - kept off the
      // tags array so it doesn't get treated as a filterable tag.
      tags: row.tags ?? [],
    };
  });
}

export async function fetchLetterCards(
  limit: number = 20,
  modes: { question: LetterScript; answer: LetterScript }[],
  categories?: string[],
  maxDifficulty?: number,
  tags?: string[]
): Promise<LetterCard[]> {
  const activeCategories = categories && categories.length > 0 ? categories : [];
  if (activeCategories.length === 0) return [];

  const jaId = await getLanguageId('ja');
  const enId = await getLanguageId('en');
  if (!jaId || !enId) return [];

  const kanaCategories = activeCategories.filter(c => c !== 'kanji');
  const wantsKanji = activeCategories.includes('kanji');
  const numBuckets = kanaCategories.length + (wantsKanji ? 1 : 0);
  if (numBuckets === 0) return [];

  // Same fair-share split as fetchFlashCards, treating "kanji" as just
  // another bucket alongside each kana category.
  const perBucket = Math.max(1, Math.ceil(limit / numBuckets));

  const [kanaPools, kanjiPool] = await Promise.all([
    Promise.all(
      kanaCategories.map(async catKey => {
        const rows = await fetchKanaRowsForCategory(catKey, jaId, enId, maxDifficulty, tags);
        return shuffle(rows).slice(0, perBucket);
      })
    ),
    wantsKanji
      ? fetchKanjiRows(jaId, enId, maxDifficulty, tags).then(rows => shuffle(rows).slice(0, perBucket))
      : Promise.resolve([]),
  ]);

  const rows = shuffle([...kanaPools.flat(), ...kanjiPool]);

  // For each row pick a random mode from the enabled modes - but only from
  // modes that row can actually satisfy. A 'kanji' question/answer script
  // needs row.hasKanji to be true; ordinary kana rows don't have that, so
  // a kanji-only mode selection would otherwise leave nothing pickable.
  // Rows that end up with zero compatible modes are skipped rather than
  // crashing on an undefined mode.
  const cards: LetterCard[] = rows
    .map(row => {
      const compatibleModes = modes.filter(
        m => (m.question !== 'kanji' || row.hasKanji) && (m.answer !== 'kanji' || row.hasKanji)
      );
      if (compatibleModes.length === 0) return null;

      const mode = compatibleModes[Math.floor(Math.random() * compatibleModes.length)];
      return {
        id: row.id,
        cardType: 'letter' as const,
        difficulty: row.difficulty,
        category: row.category,
        language: 'ja',
        tags: row.tags,
        hiragana: row.hiragana,
        katakana: row.katakana,
        romaji: row.romaji,
        kanji: row.kanji,
        hasKanji: row.hasKanji,
        questionScript: mode.question,
        answerScript: mode.answer,
      };
    })
    .filter((c): c is LetterCard => c !== null);

  return cards;
}
