-- Align public.courses with fields used by lib/types.ts Course interface.

alter table if exists public.courses
  add column if not exists hero_image text,
  add column if not exists category varchar(50),
  add column if not exists level varchar(50),
  add column if not exists estimated_hours integer,
  add column if not exists requirements text,
  add column if not exists skills text,
  add column if not exists students integer,
  add column if not exists rating numeric(2,1),
  add column if not exists featured boolean;

-- Safe defaults for fields expected by the app when creating/editing courses.
alter table if exists public.courses
  alter column students set default 0,
  alter column rating set default 0,
  alter column featured set default false;

-- Backfill existing nulls to avoid runtime null handling issues.
update public.courses
set students = coalesce(students, 0),
    rating = coalesce(rating, 0),
    featured = coalesce(featured, false);
