-- Allow admins to read all profiles under RLS.
-- Required by admin dashboard/students pages that query profile counts/lists.

alter table if exists public.profiles enable row level security;

drop policy if exists "Profiles: admin read all" on public.profiles;
create policy "Profiles: admin read all"
on public.profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and lower(coalesce(p.role, '')) = 'admin'
  )
);
