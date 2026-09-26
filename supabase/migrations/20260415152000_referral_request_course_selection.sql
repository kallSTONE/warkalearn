-- Allow learners to request a specific course for referral reward approval.

alter table if exists public.referral_reward_requests
  add column if not exists requested_course_id integer references public.courses(id) on delete set null;

create index if not exists idx_referral_reward_requests_requested_course
  on public.referral_reward_requests (requested_course_id);
