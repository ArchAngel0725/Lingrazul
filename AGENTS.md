# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

# Project state (verified 2026-07-05, see lingrazul_construct.docx for full detail)

The original construct plan (lingrazul_construct.docx) described a `content_items` / `user_progress` / `lessons` schema with a Node+Express backend. That plan has diverged from reality — do not assume it's current without checking this section first.

**Actual Supabase schema (live):** `letters_japanese` (id, hiragana, katakana, romaji, kanji, has_kanji, difficulty, category, tags), `words_japanese` (id, text), `words_english` (id, text), `words_chinese` (id, text, unused by app code so far), `word_descriptions` (id, description, category, difficulty, tags — joins to the words_* tables by shared id). There is no `users`, `user_progress`, `lessons`, `lesson_ratings`, `lesson_stats`, `copyright_claims`, or `sessions` table yet.

**Actual stack:** no backend exists — the Expo client (`lib/supabase.ts`) talks directly to Supabase. No Vercel/Railway, no Whisper, no Claude API integration yet.

**Actual app progress:** `login.tsx` has working Supabase email/password auth. Tab shell exists (learn, community, stats, settings, offline) but `learn.tsx`, `community.tsx`, and `stats.tsx` are placeholder stubs only. Query layer is written but not wired to any screen: `lib/cards.ts` (`fetchFlashCards`, `fetchLetterCards`) and `lib/cardQueue.ts` (client-side session queue: max size 10, rest after 3 correct, refill at 50%, decoy generation).

Re-verify this section against the live Supabase project and codebase before relying on it for anything load-bearing — it reflects a point-in-time check, not a live sync.
