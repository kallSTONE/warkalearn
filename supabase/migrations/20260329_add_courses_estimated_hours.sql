-- Ensure courses table has estimated_hours used by course create/edit flows.

alter table if exists public.courses
  add column if not exists estimated_hours integer;
