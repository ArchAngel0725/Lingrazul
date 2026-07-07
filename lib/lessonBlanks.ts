// lessonBlanks.ts - grading and word-bank helpers for Practical Lessons'
// fill-in-the-blank steps (see lib/lessons.ts's LessonBlank and
// supabase/sql/v2_add_lesson_blanks.sql).

import { shuffle } from './random';
import { LessonBlank } from './lessons';

// Romaji is graded case/whitespace-insensitively (typing "Genki" or
// " genki " should both count) - kana has no case to fold, but still gets
// trimmed so accidental leading/trailing spaces from a mobile keyboard
// don't fail an otherwise-correct answer.
function normalizeRomaji(s: string): string {
  return s.trim().toLowerCase();
}
function normalizeKana(s: string): string {
  return s.trim();
}

// Correct if the input matches ANY listed kana answer OR ANY listed romaji
// answer - per the "accept either script" decision, neither script is
// treated as more canonical than the other.
export function isCorrectBlankAnswer(input: string, blank: LessonBlank): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;
  const normalizedRomajiInput = normalizeRomaji(trimmed);
  if (blank.answerRomaji.some(a => normalizeRomaji(a) === normalizedRomajiInput)) return true;
  const normalizedKanaInput = normalizeKana(trimmed);
  if (blank.answerKana.some(a => normalizeKana(a) === normalizedKanaInput)) return true;
  return false;
}

// The single "correct" bubble shown in tap-to-fill mode - kana preferred
// since it's the authentic written form, falling back to romaji for a
// blank that (for whatever reason) only has a romaji answer on file.
export function displayAnswer(blank: LessonBlank): string {
  return blank.answerKana[0] ?? blank.answerRomaji[0] ?? '';
}

// Word bank for tap-to-fill mode: the correct display answer plus every
// decoy, shuffled together. Re-shuffling on every call is intentional -
// callers should call this once per step mount (e.g. via useState's
// initializer or useMemo) rather than on every render, so the bank doesn't
// visibly reshuffle out from under the learner mid-step.
export function buildWordBank(blank: LessonBlank): string[] {
  const correct = displayAnswer(blank);
  const options = [correct, ...blank.decoyWords].filter(Boolean);
  return shuffle(options);
}
