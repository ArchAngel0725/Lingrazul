// progress.ts - Writes flashcard answers into the per-content-type
// progress tables (letter_progress/word_progress/kanji_progress), which
// stats.ts's read-side aggregation depends on - without this, every
// account shows 0% forever regardless of how much gets answered.
//
// Only called for signed-in users (accounts are optional - see the
// project-state notes in AGENTS.md). Guests never get an id to write
// against, so their answers just aren't tracked, by design.
//
// contentType picks which of the three tables to write to - the caller
// (offline.tsx) already knows this from the card it's recording (word
// cards are always 'word'; letter cards are 'kanji' when hasKanji is
// true, 'letter' otherwise). This is exactly the disambiguation the old
// single user_progress table couldn't do on its own (see AGENTS.md) -
// now it's just "which table," not "which of two tables does this loose
// id happen to match."
//
// Uses a manual select-then-insert/update rather than a plain upsert,
// even though each table now has a real (user_id, <item>_id) unique
// constraint to upsert against - an upsert would overwrite exposures/
// correct_count with whatever's passed in, not increment them. A true
// atomic increment would need a small Postgres function (on conflict do
// update set exposures = table.exposures + 1, ...) - worth adding later
// if concurrent writes from the same user ever become a real risk, but a
// single user answering one card at a time doesn't need it yet.
//
// accuracy is no longer stored/recomputed here at all - it's a generated
// column (correct_count / exposures) on each progress table now, so this
// only ever needs to track exposures and correct_count.

import { supabase } from './supabase';
import { getLanguageId } from './languages';

export type ProgressContentType = 'letter' | 'word' | 'kanji';

const TABLE_BY_TYPE: Record<ProgressContentType, string> = {
  letter: 'letter_progress',
  word: 'word_progress',
  kanji: 'kanji_progress',
};

const ID_COLUMN_BY_TYPE: Record<ProgressContentType, string> = {
  letter: 'letter_id',
  word: 'word_id',
  kanji: 'kanji_id',
};

async function findProgressRow(userId: string, contentType: ProgressContentType, itemId: string) {
  const table = TABLE_BY_TYPE[contentType];
  const idColumn = ID_COLUMN_BY_TYPE[contentType];

  const { data, error } = await supabase
    .from(table)
    .select('id, exposures, correct_count')
    .eq('user_id', userId)
    .eq(idColumn, itemId)
    .maybeSingle();

  if (error) {
    console.warn(`progress: could not read ${table}`, error.message);
    return { row: null, ok: false as const };
  }
  return { row: data, ok: true as const };
}

export async function recordAnswer(
  userId: string,
  contentType: ProgressContentType,
  languageCode: string,
  itemId: string,
  wasFirstTry: boolean
): Promise<void> {
  const table = TABLE_BY_TYPE[contentType];
  const idColumn = ID_COLUMN_BY_TYPE[contentType];

  const { row, ok } = await findProgressRow(userId, contentType, itemId);
  if (!ok) return;

  const now = new Date().toISOString();
  const point = wasFirstTry ? 1 : 0;

  if (!row) {
    const languageId = await getLanguageId(languageCode);
    if (!languageId) return;

    const { error } = await supabase.from(table).insert({
      user_id: userId,
      language_id: languageId,
      [idColumn]: itemId,
      exposures: 1,
      correct_count: point,
      last_seen: now,
    });
    if (error) console.warn(`progress: could not create row in ${table}`, error.message);
    return;
  }

  const { error } = await supabase
    .from(table)
    .update({
      exposures: (row.exposures ?? 0) + 1,
      correct_count: (row.correct_count ?? 0) + point,
      last_seen: now,
      updated_at: now,
    })
    .eq('id', row.id);
  if (error) console.warn(`progress: could not update row in ${table}`, error.message);
}
