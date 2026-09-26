-- Add addressed boolean to course_review_notes
alter table if exists public.course_review_notes
  add column if not exists addressed boolean default false;

-- Optional alignment: when addressed is true mark status resolved
update public.course_review_notes set status = 'resolved' where addressed = true;
