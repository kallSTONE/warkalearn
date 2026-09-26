-- Fix student counts in admin views that filter profiles.role = 'lawyer'.
-- New DBs may still have role='student' from earlier defaults.

alter table if exists public.profiles
  alter column role set default 'lawyer';

-- Ensure all auth users have a profile row.
insert into public.profiles (id, full_name, avatar_url, role)
select
  u.id,
  coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'),
  coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture'),
  'lawyer'
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

-- Backfill old/default roles so existing users are counted in admin dashboard/students page.
update public.profiles
set role = 'lawyer'
where role is null
   or lower(trim(role)) = 'student';