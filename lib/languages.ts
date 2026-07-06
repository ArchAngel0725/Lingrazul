// languages.ts - shared lookup for the v2 `languages` table's row ids by
// code (e.g. 'ja' -> its uuid). Pulled out of cardCashe.ts so
// lib/progress.ts can reuse the same cache instead of duplicating it -
// both need "what's the id for this language code" and the row never
// changes during a session, so one small module-level cache covers both.

import { supabase } from './supabase';

const languageIdCache = new Map<string, string>();

export async function getLanguageId(code: string): Promise<string | null> {
  const cached = languageIdCache.get(code);
  if (cached) return cached;

  const { data, error } = await supabase.from('languages').select('id').eq('code', code).maybeSingle();
  if (error || !data) {
    console.error(`Failed to look up language "${code}":`, error);
    return null;
  }
  languageIdCache.set(code, data.id);
  return data.id;
}
