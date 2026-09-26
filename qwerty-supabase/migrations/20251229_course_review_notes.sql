-- Course review notes for reviewers

create table if not exists public.course_review_notes (
  id uuid primary key default gen_random_uuid(),
  course_id integer not null,
  reviewer_id uuid not null,
  content text not null,
  status text not null default 'open', -- 'open' | 'resolved'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- basic index for lookup by course
create index if not exists course_review_notes_course_id_idx on public.course_review_notes (course_id);
create index if not exists course_review_notes_reviewer_id_idx on public.course_review_notes (reviewer_id);

-- trigger to update updated_at
create or replace function public.update_course_review_notes_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_course_review_notes_updated_at
before update on public.course_review_notes
for each row execute function public.update_course_review_notes_updated_at();

-- RLS
alter table public.course_review_notes enable row level security;

-- reviewers can insert/select/update their own notes
drop policy if exists "Reviewer: manage own notes" on public.course_review_notes;
create policy "Reviewer: manage own notes" on public.course_review_notes
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'reviewer'
      and p.id = reviewer_id
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'reviewer'
      and p.id = reviewer_id
    )
  );

-- admin can select/update any notes
drop policy if exists "Admin: select notes" on public.course_review_notes;
create policy "Admin: select notes" on public.course_review_notes
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "Admin: update notes" on public.course_review_notes;
create policy "Admin: update notes" on public.course_review_notes
  for update
  to authenticated
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
