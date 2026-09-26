-- Adds a simple paid/free toggle to courses
alter table public.courses
  add column if not exists is_paid boolean not null default false;
