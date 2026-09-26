-- Add publication status to courses
-- Supports separating drafts vs published

-- Try both integer-id and uuid-id schemas gracefully

-- Add status text and published boolean if not exists
alter table if exists public.courses
  add column if not exists status text default 'published';

alter table if exists public.courses
  add column if not exists published boolean default true;

-- Optional index for filtering
create index if not exists courses_status_idx on public.courses (status);
create index if not exists courses_published_idx on public.courses (published);
