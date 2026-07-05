-- Lingrazul: add a single existing account to public.users manually.
-- Replace the email below with yours, then run in the Supabase SQL editor.

insert into public.users (id, email)
select id, email
from auth.users
where email = 'YOUR_EMAIL_HERE'
on conflict (id) do nothing;
