// lessons.ts - fetch layer for the Basics tab's lessons (app/(tabs)/learn.tsx).
// Reads from the `lessons`/`lesson_sections` tables (see
// supabase/sql/v2_lessons_schema.sql) - curated, hand-authored content, same
// "Anyone can read" RLS pattern as the letters/words/kanji content tables.

import { supabase } from './supabase';
import { getLanguageId } from './languages';

// 'fundamentals': the existing hand-authored reading lessons
// (hiragana-basics, katakana-basics), read as one long scrolling page.
// 'practical': real-world scenario lessons (ordering food, asking
// directions, etc.), read one lesson_section at a time via Next/Back (see
// learn.tsx's PracticalLessonView) - see supabase/sql/v2_add_lesson_type.sql.
export type LessonType = 'fundamentals' | 'practical';

export interface LessonSummary {
  id: string;
  key: string;
  title: string;
  subtitle: string | null;
  sortOrder: number;
  lessonType: LessonType;
}

// A fill-in-the-blank check attached to a step (see
// supabase/sql/v2_add_lesson_blanks.sql) - at most one per LessonSection.
// The sentence is prompt_before + [blank] + prompt_after; answerKana/
// answerRomaji are both "accepted" spellings (checked via
// lib/lessonBlanks.ts's isCorrectBlankAnswer) rather than one being
// canonical, per the "type in either script" decision. decoyWords are
// plain display text for the tap-to-fill word bank - never graded.
export interface LessonBlank {
  id: string;
  promptBefore: string;
  promptAfter: string;
  answerKana: string[];
  answerRomaji: string[];
  decoyWords: string[];
}

export interface LessonSection {
  id: string;
  sortOrder: number;
  heading: string | null;
  body: string;
  blank: LessonBlank | null;
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
    .select('id, key, title, subtitle, sort_order, lesson_type')
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
    // Rows written before v2_add_lesson_type.sql ran would come back null
    // over a stale PostgREST schema cache rather than erroring - fall back
    // to 'fundamentals' (the column's own DB-side default) so an unmigrated
    // environment degrades to the old single-list behavior instead of
    // silently hiding every lesson under the new 'practical' filter.
    lessonType: (row.lesson_type as LessonType) ?? 'fundamentals',
  }));
}

// Fetches one lesson's full section content, in reading order, with each
// section's blank exercise (if any) embedded - lesson_section_blanks has at
// most one row per section (see the unique constraint in
// v2_add_lesson_blanks.sql).
//
// PostgREST's embed shape for a to-one relationship (which it detects from
// that same unique constraint on lesson_section_blanks.lesson_section_id)
// is a single object or null - NOT an array like a plain to-many embed
// would be. This was actually gotten wrong on the first pass (assumed
// `.lesson_section_blanks` was always an array and did `(... ?? [])[0]`,
// which silently returns undefined when it's really an object - no error,
// blank just always came back null). normalizeBlankRow below handles
// either shape defensively so this doesn't depend on guessing right about
// which one PostgREST returns for a given version/config.
function normalizeBlankRow(raw: unknown): any {
  if (Array.isArray(raw)) return raw[0] ?? null;
  return raw ?? null;
}

export async function fetchLessonDetail(lessonId: string): Promise<LessonSection[]> {
  const { data, error } = await supabase
    .from('lesson_sections')
    .select('id, sort_order, heading, body, lesson_section_blanks(id, prompt_before, prompt_after, answer_kana, answer_romaji, decoy_words)')
    .eq('lesson_id', lessonId)
    .order('sort_order');

  if (error) {
    console.error('Failed to fetch lesson sections:', error.message);
    return [];
  }

  return (data ?? []).map((row: any) => {
    const blankRow = normalizeBlankRow(row.lesson_section_blanks);
    return {
      id: row.id,
      sortOrder: row.sort_order,
      heading: row.heading,
      body: row.body,
      blank: blankRow ? {
        id: blankRow.id,
        promptBefore: blankRow.prompt_before,
        promptAfter: blankRow.prompt_after,
        answerKana: blankRow.answer_kana ?? [],
        answerRomaji: blankRow.answer_romaji ?? [],
        decoyWords: blankRow.decoy_words ?? [],
      } : null,
    };
  });
}
