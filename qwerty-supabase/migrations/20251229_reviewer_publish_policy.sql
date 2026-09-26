-- Allow reviewers to publish courses by updating status/published
-- Applies to courses table; assumes profiles.role contains 'reviewer'

alter table if exists public.courses enable row level security;

drop policy if exists "Courses: reviewer can publish" on public.courses;
create policy "Courses: reviewer can publish" on public.courses
  for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'reviewer'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'reviewer'
    )
  );
