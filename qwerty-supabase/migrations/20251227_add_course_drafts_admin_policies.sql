-- Admin policies to allow an admin to manage all course drafts
-- Assumes profiles table with role column and values including 'admin'

-- Select any draft if requester is admin
drop policy if exists "Drafts: admin select all" on public.course_drafts;
create policy "Drafts: admin select all" on public.course_drafts
  for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Update any draft if requester is admin
drop policy if exists "Drafts: admin update all" on public.course_drafts;
create policy "Drafts: admin update all" on public.course_drafts
  for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Delete any draft if requester is admin
drop policy if exists "Drafts: admin delete all" on public.course_drafts;
create policy "Drafts: admin delete all" on public.course_drafts
  for delete
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
