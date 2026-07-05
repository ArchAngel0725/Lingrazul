// users.ts - Self-healing fallback for public.users.
//
// A database trigger (see supabase/sql/users_auto_provision.sql) should be
// creating this row automatically on signup, but if that trigger is ever
// missing, disabled, or hasn't been run yet on this project, a signed-in
// user could still end up with no row in public.users. ensureUserRow()
// checks for that and creates the row client-side as a fallback, so
// signing in never leaves someone stuck without one.

import { supabase } from './supabase';

export async function ensureUserRow(userId: string, email: string | null): Promise<void> {
  const { data: existing, error: selectError } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (selectError) {
    // Don't block sign-in over this - the trigger is the primary path,
    // this is just a backstop. Log for visibility during development.
    console.warn('ensureUserRow: could not check public.users', selectError.message);
    return;
  }

  if (existing) return;

  const { error: insertError } = await supabase
    .from('users')
    .insert({ id: userId, email });

  if (insertError) {
    console.warn('ensureUserRow: could not create public.users row', insertError.message);
  }
}
