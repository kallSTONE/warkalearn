-- Ensure courses table has slug used by routing and course CRUD flows.

alter table if exists public.courses
  add column if not exists slug text;

-- Backfill missing slugs for existing rows.
update public.courses
set slug = lower(
  regexp_replace(
    coalesce(nullif(trim(title), ''), 'course') || '-' || id::text,
    '[^a-zA-Z0-9]+',
    '-',
    'g'
  )
)
where slug is null or trim(slug) = '';

-- Trim and normalize any remaining values.
update public.courses
set slug = lower(trim(slug))
where slug is not null;

-- Keep slugs unique for course page lookups.
create unique index if not exists courses_slug_key
  on public.courses (slug);
