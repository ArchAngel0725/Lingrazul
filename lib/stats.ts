// stats.ts - Aggregates user_progress into overall + per-category accuracy
// for the Stats screen's Flashcards panel.
//
// Every category that exists on the Flash Cards tab is always included in
// the result, even ones the user hasn't touched yet (shown as 0%) - the
// category universe comes from the same two sources offline.tsx uses: word
// categories fetched live from word_descriptions, letter categories from
// the shared LETTER_CATEGORIES list.
//
// IMPORTANT ASSUMPTION: the live user_progress table (as actually created
// in Supabase) has no content_type column, so a row's item_id could in
// principle belong to either word_descriptions or letters_japanese. Since
// both tables use gen_random_uuid() primary keys, a real collision between
// the two id spaces is practically impossible - so this looks a row's
// item_id up against both tables and uses whichever one matches. If a
// content_type column gets added later, swap this for a direct filter.
//
// ALSO ASSUMED: user_progress.accuracy is stored as a 0-1 ratio (matching
// how the original construct plan described it), not a 0-100 percentage.
// If it turns out to already be 0-100 in the live data, drop the *100
// below.
//
// Nothing currently writes to user_progress anywhere in the app (see
// AGENTS.md project-state notes) - so until that's wired up, every
// category will show 0% for every user. This module only covers the read
// side.

import { supabase } from './supabase';
import { LETTER_CATEGORIES } from './categories';

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

interface ProgressRow {
  item_id: string;
  exposures: number | null;
  accuracy: number | null;
}

export async function fetchStatsSummary(userId: string): Promise<StatsSummary> {
  const [{ data: wordCategoryRows }, { data: progress }] = await Promise.all([
    supabase.from('word_descriptions').select('category'),
    supabase.from('user_progress').select('item_id, exposures, accuracy').eq('user_id', userId),
  ]);

  // Full category universe - every category that exists on the Flash Cards
  // tab, regardless of whether this user has any data for it yet.
  const wordCategories = [...new Set((wordCategoryRows ?? []).map((r: any) => r.category as string))];
  const letterCategories = [...LETTER_CATEGORIES] as string[];

  const buckets = new Map<string, { contentType: ContentType; category: string; exposures: number; weightedAccuracy: number }>();
  wordCategories.forEach(category => buckets.set(`word:${category}`, { contentType: 'word', category, exposures: 0, weightedAccuracy: 0 }));
  letterCategories.forEach(category => buckets.set(`letter:${category}`, { contentType: 'letter', category, exposures: 0, weightedAccuracy: 0 }));

  const rows = (progress ?? []) as ProgressRow[];
  let totalExposures = 0;
  let totalWeightedAccuracy = 0;
  let itemsTracked = 0;

  if (rows.length > 0) {
    const itemIds = rows.map(r => r.item_id);

    const [{ data: wordRows }, { data: letterRows }] = await Promise.all([
      supabase.from('word_descriptions').select('id, category').in('id', itemIds),
      supabase.from('letters_japanese').select('id, category').in('id', itemIds),
    ]);

    const categoryById = new Map<string, { category: string; contentType: ContentType }>();
    (wordRows ?? []).forEach((r: any) => categoryById.set(r.id, { category: r.category, contentType: 'word' }));
    (letterRows ?? []).forEach((r: any) => categoryById.set(r.id, { category: r.category, contentType: 'letter' }));

    for (const row of rows) {
      const meta = categoryById.get(row.item_id);
      if (!meta) continue; // progress row for an item that no longer exists - skip

      const exposures = row.exposures ?? 0;
      const accuracy = row.accuracy ?? 0;
      itemsTracked += 1;
      totalExposures += exposures;
      totalWeightedAccuracy += exposures * accuracy;

      const key = `${meta.contentType}:${meta.category}`;
      const bucket = buckets.get(key) ?? {
        contentType: meta.contentType,
        category: meta.category,
        exposures: 0,
        weightedAccuracy: 0,
      };
      bucket.exposures += exposures;
      bucket.weightedAccuracy += exposures * accuracy;
      buckets.set(key, bucket);
    }
  }

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
