// stats.ts - Aggregates user_progress into overall + per-category accuracy
// for the Stats screen's Flashcards panel.
//
// Every category that exists on the Flash Cards tab is always included in
// the result, even ones the user hasn't touched yet (shown as 0%) - the
// category universe comes from the same live v2 `categories` fetch
// offline.tsx uses (see categories.ts).
//
// IMPORTANT ASSUMPTION: the live user_progress table has no content_type
// column, so a row's item_id could in principle belong to the v2 `words`,
// `letters`, or `kanji` table. Since all three use gen_random_uuid()
// primary keys, a real collision between id spaces is practically
// impossible - so this looks a row's item_id up against all three and
// uses whichever one matches. If a content_type column gets added later,
// swap this for a direct filter.
//
// KNOWN DATA-CONTINUITY GAP: item_id values written before the switch to
// v2 point at the old letters_japanese/word_descriptions ids, which no
// longer exist in words/letters/kanji. Those old progress rows just won't
// match anything here anymore (silently skipped below, same as any
// item_id for content that's been removed) - existing users' historical
// accuracy/exposure counts effectively reset once this ships. There's no
// way to carry that forward automatically since the old and new ids are
// unrelated values.
//
// ALSO ASSUMED: user_progress.accuracy is stored as a 0-1 ratio (matching
// how the original construct plan described it), not a 0-100 percentage.
// If it turns out to already be 0-100 in the live data, drop the *100
// below.

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

interface ProgressRow {
  item_id: string;
  exposures: number | null;
  accuracy: number | null;
}

export async function fetchStatsSummary(userId: string): Promise<StatsSummary> {
  const [wordCategories, letterCategories, { data: progress }] = await Promise.all([
    fetchWordCategoryKeys(),
    fetchLetterCategoryKeys(),
    supabase.from('user_progress').select('item_id, exposures, accuracy').eq('user_id', userId),
  ]);

  // Full category universe - every category that exists on the Flash Cards
  // tab, regardless of whether this user has any data for it yet.

  const buckets = new Map<string, { contentType: ContentType; category: string; exposures: number; weightedAccuracy: number }>();
  wordCategories.forEach(category => buckets.set(`word:${category}`, { contentType: 'word', category, exposures: 0, weightedAccuracy: 0 }));
  letterCategories.forEach(category => buckets.set(`letter:${category}`, { contentType: 'letter', category, exposures: 0, weightedAccuracy: 0 }));

  const rows = (progress ?? []) as ProgressRow[];
  let totalExposures = 0;
  let totalWeightedAccuracy = 0;
  let itemsTracked = 0;

  if (rows.length > 0) {
    const itemIds = rows.map(r => r.item_id);

    // kanji is its own table in v2 (see AGENTS.md) - it counts as
    // contentType 'letter' with category 'kanji' here, matching the
    // pseudo-category the Flash Cards UI already treats it as
    // (categories.ts).
    const [{ data: wordRows }, { data: letterRows }, { data: kanjiRows }] = await Promise.all([
      supabase.from('words').select('id, categories(key)').in('id', itemIds),
      supabase.from('letters').select('id, categories(key)').in('id', itemIds),
      supabase.from('kanji').select('id').in('id', itemIds),
    ]);

    const categoryById = new Map<string, { category: string; contentType: ContentType }>();
    (wordRows ?? []).forEach((r: any) =>
      categoryById.set(r.id, { category: r.categories?.key ?? '', contentType: 'word' })
    );
    (letterRows ?? []).forEach((r: any) =>
      categoryById.set(r.id, { category: r.categories?.key ?? '', contentType: 'letter' })
    );
    (kanjiRows ?? []).forEach((r: any) =>
      categoryById.set(r.id, { category: 'kanji', contentType: 'letter' })
    );

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
