-- Lingrazul: user_progress.item_id can point to either word_descriptions.id
-- or letters_japanese.id depending on the row (see lib/stats.ts / lib/progress.ts
-- for how the app disambiguates by checking both tables). The existing FK
-- constraint locks item_id to a single table - almost certainly the old
-- unused content_items table from the original schema - which rejects
-- every insert since neither word nor letter ids live there.
--
-- Run in the Supabase SQL editor.

alter table public.user_progress
  drop constraint user_progress_item_id_fkey;
