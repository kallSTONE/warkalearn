-- Create table for server-backed course drafts
-- Stores per-user JSON payload and updated time; unique per user

create table if not exists public.course_drafts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- Unique constraint: one draft per user
create unique index if not exists course_drafts_user_id_key on public.course_drafts (user_id);

-- Optional: add foreign key to profiles if desired (commented to avoid migration failure if missing)
-- alter table public.course_drafts
--   add constraint course_drafts_user_fk
--   foreign key (user_id) references public.profiles(id) on delete cascade;

-- RLS: enable row-level security and policies if needed
alter table public.course_drafts enable row level security;

-- Allow users to manage their own drafts
drop policy if exists "Drafts: select own" on public.course_drafts;
create policy "Drafts: select own" on public.course_drafts
  for select
  using (auth.uid() = user_id);

drop policy if exists "Drafts: insert own" on public.course_drafts;
create policy "Drafts: insert own" on public.course_drafts
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Drafts: update own" on public.course_drafts;
create policy "Drafts: update own" on public.course_drafts
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Drafts: delete own" on public.course_drafts;
create policy "Drafts: delete own" on public.course_drafts
  for delete
  using (auth.uid() = user_id);
