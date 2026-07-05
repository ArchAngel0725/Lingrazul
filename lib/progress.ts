// progress.ts - Writes flashcard answers into user_progress. This is the
// missing write-side that stats.ts's read-side aggregation depends on -
// without this, every account shows 0% forever regardless of how much
// gets answered.
//
// Only called for signed-in users (accounts are optional - see the
// project-state notes in AGENTS.md). Guests never get an id to write
// against, so their answers just aren't tracked, by design.
//
// Uses a manual select-then-insert/update instead of an upsert with
// onConflict, since we can't confirm a (user_id, item_id) unique
// constraint actually exists on the live table - this works regardless.
//
// accuracy is treated as a 0-1 ratio, weighted across every exposure (not
// just first tries): newAccuracy = (oldAccuracy*oldExposures + point) / newExposures.
// "point" is 1 only if the card was answered correctly on the first tap of
// that viewing - getting it right after a wrong guess still counts as an
// exposure, just not a correct one, which is the more honest signal for
// an accuracy stat.

import { supabase } from './supabase';

async function findProgressRow(userId: string, itemId: string) {
  const { data, error } = await supabase
    .from('user_progress')
    .select('id, exposures, accuracy')
    .eq('user_id', userId)
    .eq('item_id', itemId)
    .maybeSingle();

  if (error) {
    console.warn('progress: could not read user_progress', error.message);
    return { row: null, ok: false as const };
  }
  return { row: data, ok: true as const };
}

export async function recordAnswer(userId: string, itemId: string, wasFirstTry: boolean): Promise<void> {
  const { row, ok } = await findProgressRow(userId, itemId);
  if (!ok) return;

  const now = new Date().toISOString();
  const point = wasFirstTry ? 1 : 0;

  if (!row) {
    const { error } = await supabase.from('user_progress').insert({
      user_id: userId,
      item_id: itemId,
      exposures: 1,
      accuracy: point,
      last_seen: now,
    });
    if (error) console.warn('progress: could not create row', error.message);
    return;
  }

  const prevExposures = row.exposures ?? 0;
  const prevAccuracy = row.accuracy ?? 0;
  const newExposures = prevExposures + 1;
  const newAccuracy = (prevAccuracy * prevExposures + point) / newExposures;

  const { error } = await supabase
    .from('user_progress')
    .update({ exposures: newExposures, accuracy: newAccuracy, last_seen: now })
    .eq('id', row.id);
  if (error) console.warn('progress: could not update row', error.message);
}
