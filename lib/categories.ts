// categories.ts - Shared category helpers used by both the Flash Cards
// screen (offline.tsx) and the Stats screen, so the two can't drift apart.
//
// Both word and letter categories are now fetched live from the v2
// `categories` table (content_type = 'word' / 'letter') instead of one
// being live (word_descriptions.category) and the other a hardcoded static
// list - the old letters_japanese schema had no queryable category list at
// all, which is why LETTER_CATEGORIES used to just be a static array.
// Now that categories are real rows, both are sourced the same way.
//
// 'kanji' is NOT a content_type = 'letter' category in the v2 schema -
// kanji categories (e.g. 'n5') live under content_type = 'unique_feature'
// instead (see supabase/sql/v2_unique_features.sql). The Flash Cards UI
// still treats "kanji" as one flat toggle in the Letters panel, matching
// the old behavior where kanji was just another letters_japanese category
// - so fetchLetterCategoryKeys appends the literal string 'kanji' onto the
// live letter-category list as a UI pseudo-category, which
// lib/cardCashe.ts resolves to the real `kanji` table.

import { supabase } from './supabase';

export const WORD_CATEGORY_FALLBACK = [
  'demonstrative',
  'kosoado',
  'particle',
  'verb',
];

// Static fallback only for the brief window before the live fetch below
// resolves (same role as WORD_CATEGORY_FALLBACK) or if it fails outright -
// not the source of truth anymore.
export const LETTER_CATEGORIES_FALLBACK = [
  'vowel', 'k-row', 's-row', 't-row', 'n-row',
  'h-row', 'm-row', 'y-row', 'r-row', 'w-row',
  'n-standalone', 'dakuten', 'handakuten',
  'youon', 'katakana-extended', 'kanji',
];

async function fetchCategoryKeys(contentType: 'word' | 'letter'): Promise<string[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('key, sort_order, languages!inner(code)')
    .eq('content_type', contentType)
    .eq('languages.code', 'ja')
    .order('sort_order', { ascending: true });

  if (error || !data) {
    console.error(`Failed to fetch ${contentType} categories:`, error);
    return contentType === 'word' ? WORD_CATEGORY_FALLBACK : LETTER_CATEGORIES_FALLBACK;
  }
  return data.map((row: any) => row.key as string);
}

export function fetchWordCategoryKeys(): Promise<string[]> {
  return fetchCategoryKeys('word');
}

// Appends the 'kanji' pseudo-category (see file header) to the live letter
// category list.
export async function fetchLetterCategoryKeys(): Promise<string[]> {
  const keys = await fetchCategoryKeys('letter');
  return [...keys, 'kanji'];
}
