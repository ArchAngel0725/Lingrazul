// lessons.ts - fetch layer for the Basics tab's lessons (app/(tabs)/learn.tsx).
// Reads from the `lessons`/`lesson_sections` tables (see
// supabase/sql/v2_lessons_schema.sql) - curated, hand-authored content, same
// "Anyone can read" RLS pattern as the letters/words/kanji content tables.

import { supabase } from './supabase';
import { getLanguageId } from './languages';

export interface LessonSummary {
  id: string;
  key: string;
  title: string;
  subtitle: string | null;
  sortOrder: number;
}

export interface LessonSection {
  id: string;
  sortOrder: number;
  heading: string | null;
  body: string;
}

export interface LessonDetail extends LessonSummary {
  sections: LessonSection[];
}

// Fetches every lesson for a language (e.g. 'ja'), in display order.
// Returns [] (not an error) if the language code doesn't resolve or there
// are no lessons yet - callers show an empty state rather than crashing.
export async function fetchLessons(languageCode: string): Promise<LessonSummary[]> {
  const languageId = await getLanguageId(languageCode);
  if (!languageId) return [];

  const { data, error } = await supabase
    .from('lessons')
    .select('id, key, title, subtitle, sort_order')
    .eq('language_id', languageId)
    .order('sort_order');

  if (error) {
    console.error('Failed to fetch lessons:', error.message);
    return [];
  }

  return (data ?? []).map(row => ({
    id: row.id,
    key: row.key,
    title: row.title,
    subtitle: row.subtitle,
    sortOrder: row.sort_order,
  }));
}

// Fetches one lesson's full section content, in reading order.
export async function fetchLessonDetail(lessonId: string): Promise<LessonSection[]> {
  const { data, error } = await supabase
    .from('lesson_sections')
    .select('id, sort_order, heading, body')
    .eq('lesson_id', lessonId)
    .order('sort_order');

  if (error) {
    console.error('Failed to fetch lesson sections:', error.message);
    return [];
  }

  return (data ?? []).map(row => ({
    id: row.id,
    sortOrder: row.sort_order,
    heading: row.heading,
    body: row.body,
  }));
}
