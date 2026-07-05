-- Lingrazul: auto-provision public.users on signup
-- Run in the Supabase SQL editor.
--
-- Problem: signing up creates a row in Supabase's built-in auth.users, but
-- nothing was inserting a matching row into the app's public.users table
-- (id, email, style_preference, created_at) - so every new account left
-- that table empty. This adds the trigger that was missing, plus a
-- one-time backfill for anyone who already signed up before it existed.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Backfill existing accounts that signed up before this trigger existed.
insert into public.users (id, email)
select id, email
from auth.users
where id not in (select id from public.users)
on conflict (id) do nothing;


-- Optional - only run these if public.users doesn't already have RLS set
-- up (skip if you get "policy already exists" errors). The insert policy
-- matters even with the trigger above: the app's login screen also has a
-- client-side fallback (lib/users.ts ensureUserRow) that inserts a row
-- itself if one is ever missing, and that insert needs to be allowed by
-- RLS same as the trigger's (the trigger runs as security definer so it
-- bypasses RLS, but the client-side fallback does not).
--
-- alter table public.users enable row level security;
--
-- create policy "Users can view own row"
--   on public.users for select
--   using (auth.uid() = id);
--
-- create policy "Users can insert own row"
--   on public.users for insert
--   with check (auth.uid() = id);
--
-- create policy "Users can update own row"
--   on public.users for update
--   using (auth.uid() = id);
