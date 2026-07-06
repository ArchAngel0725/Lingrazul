// stats.ts - Aggregates the per-content-type progress tables
// (letter_progress/word_progress/kanji_progress) into overall +
// per-category accuracy for the Stats screen's Flashcards panel.
//
// Every category that exists on the Flash Cards tab is always included in
// the result, even ones the user hasn't touched yet (shown as 0%) - the
// category universe comes from the same live v2 `categories` fetch
// offline.tsx uses (see categories.ts).
//
// This is simpler than the old version, which had to cross-reference an
// opaque user_progress.item_id against both word_descriptions AND
// letters_japanese since there was no way to know which table it
// belonged to. Progress is now split into three real tables (see
// v2_progress_schema.sql), so a row's content type is just "which table
// did this come from" - no guessing, no ambiguity.
//
// kanji rows count as contentType 'letter' with category 'kanji', matching
// the pseudo-category the Flash Cards UI already treats it as
// (categories.ts).
//
// ASSUMPTION: accuracy is stored as a 0-1 ratio (it's a generated column,
// correct_count / exposures, see v2_progress_schema.sql), converted to a
// 0-100 percentage below.

import { supabase } from './supabase';
import { fetchWordCategoryKeys, fetchLetterCategoryKeys } from './categories';

export type ContentType = 'word' | 'letter';

export interface CategoryStat {
  category: string;
  contentType: ContentType;
  exposures: number;
  accuracyPercent: number; // 0-100, weighted by exposures. 0 when untouched.
}

export interface StatsSummary {
  overallAccuracyPercent: number;
  totalExposures: number;
  itemsTracked: number;
  categories: CategoryStat[];
}

interface Bucket {
  contentType: ContentType;
  category: string;
  exposures: number;
  weightedAccuracy: number;
}

function addToBucket(
  buckets: Map<string, Bucket>,
  contentType: ContentType,
  category: string,
  exposures: number,
  accuracy: number
) {
  const key = `${contentType}:${category}`;
  const bucket = buckets.get(key) ?? { contentType, category, exposures: 0, weightedAccuracy: 0 };
  bucket.exposures += exposures;
  bucket.weightedAccuracy += exposures * accuracy;
  buckets.set(key, bucket);
}

export async function fetchStatsSummary(userId: string): Promise<StatsSummary> {
  const [wordCategories, letterCategories] = await Promise.all([
    fetchWordCategoryKeys(),
    fetchLetterCategoryKeys(),
  ]);

  // Full category universe - every category that exists on the Flash Cards
  // tab, regardless of whether this user has any data for it yet.
  const buckets = new Map<string, Bucket>();
  wordCategories.forEach(category => buckets.set(`word:${category}`, { contentType: 'word', category, exposures: 0, weightedAccuracy: 0 }));
  letterCategories.forEach(category => buckets.set(`letter:${category}`, { contentType: 'letter', category, exposures: 0, weightedAccuracy: 0 }));

  const [{ data: wordRows }, { data: letterRows }, { data: kanjiRows }] = await Promise.all([
    supabase.from('word_progress').select('exposures, accuracy, words(categories(key))').eq('user_id', userId),
    supabase.from('letter_progress').select('exposures, accuracy, letters(categories(key))').eq('user_id', userId),
    supabase.from('kanji_progress').select('exposures, accuracy').eq('user_id', userId),
  ]);

  let totalExposures = 0;
  let totalWeightedAccuracy = 0;
  let itemsTracked = 0;

  (wordRows ?? []).forEach((r: any) => {
    const exposures = r.exposures ?? 0;
    const accuracy = r.accuracy ?? 0;
    itemsTracked += 1;
    totalExposures += exposures;
    totalWeightedAccuracy += exposures * accuracy;
    addToBucket(buckets, 'word', r.words?.categories?.key ?? '', exposures, accuracy);
  });

  (letterRows ?? []).forEach((r: any) => {
    const exposures = r.exposures ?? 0;
    const accuracy = r.accuracy ?? 0;
    itemsTracked += 1;
    totalExposures += exposures;
    totalWeightedAccuracy += exposures * accuracy;
    addToBucket(buckets, 'letter', r.letters?.categories?.key ?? '', exposures, accuracy);
  });

  (kanjiRows ?? []).forEach((r: any) => {
    const exposures = r.exposures ?? 0;
    const accuracy = r.accuracy ?? 0;
    itemsTracked += 1;
    totalExposures += exposures;
    totalWeightedAccuracy += exposures * accuracy;
    addToBucket(buckets, 'letter', 'kanji', exposures, accuracy);
  });

  const categories: CategoryStat[] = Array.from(buckets.values())
    .map(b => ({
      category: b.category,
      contentType: b.contentType,
      exposures: b.exposures,
      accuracyPercent: b.exposures > 0 ? Math.round((b.weightedAccuracy / b.exposures) * 100) : 0,
    }))
    .sort((a, b) => {
      if (a.contentType !== b.contentType) return a.contentType === 'word' ? -1 : 1;
      return a.category.localeCompare(b.category);
    });

  return {
    overallAccuracyPercent: totalExposures > 0 ? Math.round((totalWeightedAccuracy / totalExposures) * 100) : 0,
    totalExposures,
    itemsTracked,
    categories,
  };
}
