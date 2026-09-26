-- Certification system v1
-- Course-scoped, timed exam, public verification, and certificate issuance.

create table if not exists public.certification_settings (
  id uuid not null default gen_random_uuid (),
  course_id integer not null,
  enabled boolean not null default false,
  passing_score integer not null default 70,
  time_per_question_minutes integer not null default 2,
  retry_cooldown_hours integer not null default 48,
  question_limit integer null,
  verification_base_url text not null default 'https://earn-neway.vercel.app/certverify',
  certificate_title text not null default 'Course Certification',
  issuer_name text not null default 'Neway',
  logo_path text not null default '/assets/images/warkalogo.png',
  template_variant text not null default 'premium-minimal',
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint certification_settings_pkey primary key (id),
  constraint certification_settings_course_id_key unique (course_id),
  constraint certification_settings_course_id_fkey foreign key (course_id) references courses (id) on delete cascade,
  constraint certification_settings_passing_score_check check (passing_score between 0 and 100),
  constraint certification_settings_time_per_question_check check (time_per_question_minutes > 0),
  constraint certification_settings_retry_cooldown_check check (retry_cooldown_hours > 0)
) tablespace pg_default;

create trigger certification_settings_updated_at
before update on public.certification_settings
for each row execute function public.handle_updated_at();

create table if not exists public.certification_questions (
  id uuid not null default gen_random_uuid (),
  course_id integer not null,
  question text not null,
  options jsonb not null,
  correct_option integer not null,
  explanation text null,
  sort_order integer not null default 1,
  active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint certification_questions_pkey primary key (id),
  constraint certification_questions_course_id_fkey foreign key (course_id) references courses (id) on delete cascade,
  constraint certification_questions_correct_option_check check (correct_option >= 0)
) tablespace pg_default;

create index if not exists certification_questions_course_id_idx on public.certification_questions using btree (course_id) tablespace pg_default;
create index if not exists certification_questions_course_id_active_idx on public.certification_questions using btree (course_id, active, sort_order) tablespace pg_default;

create trigger certification_questions_updated_at
before update on public.certification_questions
for each row execute function public.handle_updated_at();

create table if not exists public.certification_attempts (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  course_id integer not null,
  attempt_number integer not null default 1,
  started_at timestamp with time zone not null default now(),
  submitted_at timestamp with time zone null,
  duration_seconds integer null,
  score integer not null default 0,
  passed boolean not null default false,
  answers jsonb not null default '[]'::jsonb,
  question_snapshot jsonb not null default '[]'::jsonb,
  next_retry_at timestamp with time zone null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint certification_attempts_pkey primary key (id),
  constraint certification_attempts_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade,
  constraint certification_attempts_course_id_fkey foreign key (course_id) references courses (id) on delete cascade,
  constraint certification_attempts_user_course_attempt_key unique (user_id, course_id, attempt_number)
) tablespace pg_default;

create index if not exists certification_attempts_user_id_idx on public.certification_attempts using btree (user_id) tablespace pg_default;
create index if not exists certification_attempts_course_id_idx on public.certification_attempts using btree (course_id) tablespace pg_default;

create trigger certification_attempts_updated_at
before update on public.certification_attempts
for each row execute function public.handle_updated_at();

create table if not exists public.certificates (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  course_id integer not null,
  attempt_id uuid null,
  certificate_code text not null,
  verification_url text not null,
  pdf_url text null,
  status text not null default 'active',
  pass_score integer not null default 70,
  issued_at timestamp with time zone not null default now(),
  revoked_at timestamp with time zone null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint certificates_pkey primary key (id),
  constraint certificates_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade,
  constraint certificates_course_id_fkey foreign key (course_id) references courses (id) on delete cascade,
  constraint certificates_attempt_id_fkey foreign key (attempt_id) references certification_attempts (id) on delete set null,
  constraint certificates_certificate_code_key unique (certificate_code),
  constraint certificates_user_course_key unique (user_id, course_id),
  constraint certificates_status_check check (status in ('active', 'revoked'))
) tablespace pg_default;

create index if not exists certificates_user_id_idx on public.certificates using btree (user_id) tablespace pg_default;
create index if not exists certificates_course_id_idx on public.certificates using btree (course_id) tablespace pg_default;
create index if not exists certificates_certificate_code_idx on public.certificates using btree (certificate_code) tablespace pg_default;

create trigger certificates_updated_at
before update on public.certificates
for each row execute function public.handle_updated_at();

alter table public.certification_settings enable row level security;
alter table public.certification_questions enable row level security;
alter table public.certification_attempts enable row level security;
alter table public.certificates enable row level security;

drop policy if exists "Public can view certification settings" on public.certification_settings;
create policy "Public can view certification settings"
on public.certification_settings for select
using (true);

drop policy if exists "Admins manage certification settings" on public.certification_settings;
create policy "Admins manage certification settings"
on public.certification_settings for all
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

drop policy if exists "Public can view certification questions" on public.certification_questions;
create policy "Public can view certification questions"
on public.certification_questions for select
using (true);

drop policy if exists "Admins manage certification questions" on public.certification_questions;
create policy "Admins manage certification questions"
on public.certification_questions for all
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

drop policy if exists "Users can view own certification attempts" on public.certification_attempts;
create policy "Users can view own certification attempts"
on public.certification_attempts for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own certification attempts" on public.certification_attempts;
create policy "Users can insert own certification attempts"
on public.certification_attempts for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Admins manage certification attempts" on public.certification_attempts;
create policy "Admins manage certification attempts"
on public.certification_attempts for all
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

drop policy if exists "Public can verify certificates" on public.certificates;
create policy "Public can verify certificates"
on public.certificates for select
using (status = 'active');

drop policy if exists "Users can view own certificates" on public.certificates;
create policy "Users can view own certificates"
on public.certificates for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own certificates" on public.certificates;
create policy "Users can insert own certificates"
on public.certificates for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own certificates" on public.certificates;
create policy "Users can update own certificates"
on public.certificates for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Admins manage certificates" on public.certificates;
create policy "Admins manage certificates"
on public.certificates for all
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
