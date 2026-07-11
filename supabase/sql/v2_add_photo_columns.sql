-- Lingrazul: adds an optional photo to every flashcardable content table
-- (words, letters, kanji) so a card can show a picture alongside its text
-- when one makes sense (e.g. a word like 猫/"cat"), while cards where a
-- photo doesn't make sense (e.g. a kana row, a particle) just leave it
-- null and render exactly as before.
--
-- image_url is a plain text column holding a URL - no foreign key, no
-- Storage-specific type. It can point at a Supabase Storage public URL or
-- any other externally-hosted image. This file also provisions a public
-- Storage bucket ('card-images') as the default place to put those files,
-- since no external image host exists for this project yet - upload
-- images to that bucket by hand via the Supabase dashboard's Storage tab,
-- then paste the resulting public URL into the relevant row's image_url
-- column (also by hand, same pattern as the rest of this content).
--
-- Safe to re-run - every statement is idempotent (add column if not
-- exists / insert ... on conflict do nothing).
--
-- Run in the Supabase SQL editor, after v2_content_schema.sql.

alter table words add column if not exists image_url text;
alter table letters add column if not exists image_url text;
alter table kanji add column if not exists image_url text;

-- Public bucket for hand-uploaded card photos. Public so the app's anon
-- key can load images directly by URL without needing signed-URL logic -
-- same "public reference content" reasoning as the rest of the v2 content
-- tables having open read access (see v2_add_read_policies.sql).
insert into storage.buckets (id, name, public)
values ('card-images', 'card-images', true)
on conflict (id) do nothing;

-- Storage buckets have RLS enabled by default with no policies, same
-- gotcha v2_add_read_policies.sql already hit for ordinary tables - without
-- this, the bucket exists but nothing (including the app) can read from it.
drop policy if exists "Public read access for card-images" on storage.objects;
create policy "Public read access for card-images"
  on storage.objects for select
  using (bucket_id = 'card-images');
