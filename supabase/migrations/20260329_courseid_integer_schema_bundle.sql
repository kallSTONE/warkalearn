-- Bundle migration: adds missing course-related tables with integer course_id,
-- required functions/triggers, and baseline RLS policies used by the app.

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Helper functions used by triggers
-- -----------------------------------------------------------------------------

create or replace function public.update_modified_at()
returns trigger
language plpgsql
as $$
begin
  new.modified_at = now();
  return new;
end;
$$;

create or replace function public.update_site_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Preflight normalization: ensure public.courses.id is integer.
-- This handles older schemas where courses.id and course_enrollments.course_id
-- were UUID, while current app queries use integer course IDs.
-- -----------------------------------------------------------------------------

do $$
declare
  v_courses_id_type text;
begin
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'courses'
  ) then
    return;
  end if;

  select c.data_type
  into v_courses_id_type
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'courses'
    and c.column_name = 'id';

  if v_courses_id_type = 'uuid' then
    -- Add integer surrogate and populate existing rows.
    alter table public.courses
      add column if not exists id_int integer;

    create sequence if not exists public.courses_id_int_seq;

    alter sequence public.courses_id_int_seq owned by public.courses.id_int;

    alter table public.courses
      alter column id_int set default nextval('public.courses_id_int_seq');

    update public.courses
    set id_int = nextval('public.courses_id_int_seq')
    where id_int is null;

    alter table public.courses
      alter column id_int set not null;

    create unique index if not exists courses_id_int_key on public.courses(id_int);

    -- Convert course_enrollments.course_id from UUID to INTEGER if needed.
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'course_enrollments'
        and column_name = 'course_id'
        and data_type = 'uuid'
    ) then
      alter table public.course_enrollments
        add column if not exists course_id_int integer;

      update public.course_enrollments ce
      set course_id_int = c.id_int
      from public.courses c
      where ce.course_id = c.id;

      alter table public.course_enrollments
        drop constraint if exists course_enrollments_course_id_fkey;

      alter table public.course_enrollments
        drop constraint if exists course_enrollments_user_id_course_id_key;

      alter table public.course_enrollments
        alter column course_id_int set not null;

      alter table public.course_enrollments
        drop column course_id;

      alter table public.course_enrollments
        rename column course_id_int to course_id;

      alter table public.course_enrollments
        add constraint course_enrollments_user_id_course_id_key unique (user_id, course_id);
    end if;

    -- Move UUID id to legacy_uuid, promote integer id_int to primary key id.
    alter table public.courses
      drop constraint if exists courses_pkey;

    alter table public.courses
      rename column id to legacy_uuid;

    alter table public.courses
      rename column id_int to id;

    alter table public.courses
      add constraint courses_pkey primary key (id);

    create unique index if not exists courses_legacy_uuid_key on public.courses(legacy_uuid);
  end if;
end
$$;

-- -----------------------------------------------------------------------------
-- Core tables requested
-- -----------------------------------------------------------------------------

create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  lesson_id integer not null,
  course_id integer not null,
  is_required boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.lessons (
  id serial primary key,
  course_id integer not null,
  title varchar(255) not null,
  description text,
  estimated_time integer,
  step_order integer default 1,
  topics jsonb,
  video_url text default 'https://www.youtube.com/watch?v=lEOad0pBh9s'
);

create index if not exists idx_lessons_course_id
  on public.lessons (course_id);

create index if not exists idx_quizzes_course_id
  on public.quizzes (course_id);

create unique index if not exists idx_quizzes_lesson_id_unique
  on public.quizzes (lesson_id);

create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null,
  questions jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_quiz_questions_quiz_id
  on public.quiz_questions (quiz_id);

create table if not exists public.lesson_downloads (
  id serial primary key,
  lesson_id integer not null,
  title varchar(255) not null,
  description text,
  file_url text not null,
  file_type varchar(50) not null,
  file_size integer,
  uploaded_at timestamptz not null default now(),
  modified_at timestamptz not null default now()
);

create index if not exists lesson_downloads_lesson_id_idx
  on public.lesson_downloads (lesson_id);

create table if not exists public.lesson_quiz_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  lesson_id integer not null,
  quiz_id uuid not null,
  completed_at timestamptz not null default now(),
  constraint lesson_quiz_completions_user_id_lesson_id_key unique (user_id, lesson_id)
);

create index if not exists idx_lesson_quiz_completions_user
  on public.lesson_quiz_completions (user_id);

create index if not exists idx_lesson_quiz_completions_quiz
  on public.lesson_quiz_completions (quiz_id);

create table if not exists public.course_media (
  id bigserial primary key,
  course_id integer not null,
  type text not null,
  provider text not null,
  url text not null,
  created_at timestamptz not null default now()
);

create index if not exists course_media_course_id_idx
  on public.course_media (course_id);

create table if not exists public.site_settings (
  id integer primary key default 1,
  hero_title text,
  hero_subtitle text,
  hero_cta_text text,
  hero_cta_link text,
  hero_video_id text,
  default_theme text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint site_settings_singleton check (id = 1)
);

create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  thumbnail text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  price numeric(10,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_programs_status
  on public.programs (status);

create table if not exists public.program_courses (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null,
  course_id integer not null,
  sort_order integer not null default 0,
  is_required boolean not null default true,
  created_at timestamptz not null default now(),
  constraint program_courses_program_course_unique unique (program_id, course_id)
);

create index if not exists idx_program_courses_program
  on public.program_courses (program_id);

create index if not exists idx_program_courses_course
  on public.program_courses (course_id);

create table if not exists public.program_enrollments (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null,
  user_id uuid not null,
  status text not null default 'active' check (status in ('active', 'completed', 'dropped')),
  progress_percentage numeric(5,2) not null default 0,
  started_at timestamptz default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint program_enrollments_program_user_unique unique (program_id, user_id)
);

create index if not exists idx_program_enrollments_user
  on public.program_enrollments (user_id);

create index if not exists idx_program_enrollments_program
  on public.program_enrollments (program_id);

-- -----------------------------------------------------------------------------
-- Make sure course_id columns are integer where expected
-- -----------------------------------------------------------------------------

alter table if exists public.quizzes
  alter column course_id type integer using course_id::integer;

alter table if exists public.course_media
  alter column course_id type integer using course_id::integer;

alter table if exists public.program_courses
  alter column course_id type integer using course_id::integer;

-- -----------------------------------------------------------------------------
-- Foreign keys (added conditionally for idempotency)
-- -----------------------------------------------------------------------------

do $$
declare
  v_courses_id_type text;
begin
  select c.data_type
  into v_courses_id_type
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'courses'
    and c.column_name = 'id';

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'courses'
  ) and v_courses_id_type = 'integer' then
    begin
      alter table public.lessons
        add constraint lessons_course_id_fkey
        foreign key (course_id) references public.courses(id) on delete cascade;
    exception when duplicate_object then null;
    end;

    begin
      alter table public.quizzes
        add constraint quizzes_course_id_fkey
        foreign key (course_id) references public.courses(id) on delete cascade;
    exception when duplicate_object then null;
    end;

    begin
      alter table public.course_media
        add constraint course_media_course_id_fkey
        foreign key (course_id) references public.courses(id) on delete cascade;
    exception when duplicate_object then null;
    end;

    begin
      alter table public.program_courses
        add constraint program_courses_course_id_fkey
        foreign key (course_id) references public.courses(id) on delete restrict;
    exception when duplicate_object then null;
    end;
  end if;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'lessons'
  ) then
    begin
      alter table public.quizzes
        add constraint quizzes_lesson_id_fkey
        foreign key (lesson_id) references public.lessons(id) on delete cascade;
    exception when duplicate_object then null;
    end;

    begin
      alter table public.lesson_downloads
        add constraint lesson_downloads_lesson_id_fkey
        foreign key (lesson_id) references public.lessons(id) on delete cascade;
    exception when duplicate_object then null;
    end;

    begin
      alter table public.lesson_quiz_completions
        add constraint lesson_quiz_completions_lesson_id_fkey
        foreign key (lesson_id) references public.lessons(id) on delete cascade;
    exception when duplicate_object then null;
    end;
  end if;

  begin
    alter table public.quiz_questions
      add constraint quiz_questions_quiz_id_fkey
      foreign key (quiz_id) references public.quizzes(id) on delete cascade;
  exception when duplicate_object then null;
  end;

  begin
    alter table public.lesson_quiz_completions
      add constraint lesson_quiz_completions_quiz_id_fkey
      foreign key (quiz_id) references public.quizzes(id) on delete cascade;
  exception when duplicate_object then null;
  end;

  begin
    alter table public.lesson_quiz_completions
      add constraint lesson_quiz_completions_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  exception when duplicate_object then null;
  end;

  begin
    alter table public.program_courses
      add constraint program_courses_program_id_fkey
      foreign key (program_id) references public.programs(id) on delete cascade;
  exception when duplicate_object then null;
  end;

  begin
    alter table public.program_enrollments
      add constraint program_enrollments_program_id_fkey
      foreign key (program_id) references public.programs(id) on delete cascade;
  exception when duplicate_object then null;
  end;

  begin
    alter table public.program_enrollments
      add constraint program_enrollments_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  exception when duplicate_object then null;
  end;
end
$$;

-- -----------------------------------------------------------------------------
-- Triggers
-- -----------------------------------------------------------------------------

drop trigger if exists set_modified_at on public.lesson_downloads;
create trigger set_modified_at
before update on public.lesson_downloads
for each row execute function public.update_modified_at();

drop trigger if exists update_site_settings_updated_at on public.site_settings;
create trigger update_site_settings_updated_at
before update on public.site_settings
for each row execute function public.update_site_settings_updated_at();

drop trigger if exists set_programs_updated_at on public.programs;
create trigger set_programs_updated_at
before update on public.programs
for each row execute function public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- Keep quizzes.course_id in sync with lessons.course_id
-- -----------------------------------------------------------------------------

create or replace function public.set_quizzes_course_id()
returns trigger
language plpgsql
as $$
begin
  if new.lesson_id is not null then
    select l.course_id into new.course_id
    from public.lessons l
    where l.id = new.lesson_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_quizzes_course_id on public.quizzes;
create trigger trg_set_quizzes_course_id
before insert or update of lesson_id on public.quizzes
for each row
execute function public.set_quizzes_course_id();

create or replace function public.propagate_lesson_course_to_quizzes()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and new.course_id is distinct from old.course_id then
    update public.quizzes q
    set course_id = new.course_id
    where q.lesson_id = new.id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_propagate_lesson_course_to_quizzes on public.lessons;
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'lessons'
  ) then
    create trigger trg_propagate_lesson_course_to_quizzes
    after update of course_id on public.lessons
    for each row
    execute function public.propagate_lesson_course_to_quizzes();
  end if;
end
$$;

-- -----------------------------------------------------------------------------
-- Course progress updater used by lesson quiz flow
-- -----------------------------------------------------------------------------

create unique index if not exists course_progress_enrollment_id_key
  on public.course_progress (enrollment_id);

create or replace function public.update_course_progress_for_quiz(
  p_user_id uuid,
  p_quiz_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_course_id integer;
  v_is_required boolean;
  v_total_lessons integer;
  v_required_quiz_lessons integer;
  v_target_lessons integer;
  v_completed_lessons integer;
  v_progress numeric;
  v_completed boolean;
  v_enrollment_id uuid;
begin
  select q.course_id, q.is_required
  into v_course_id, v_is_required
  from public.quizzes q
  where q.id = p_quiz_id
  limit 1;

  if v_course_id is null then
    return;
  end if;

  select count(*)::integer
  into v_total_lessons
  from public.lessons l
  where l.course_id = v_course_id;

  select count(*)::integer
  into v_required_quiz_lessons
  from public.quizzes q
  where q.course_id = v_course_id
    and q.is_required = true;

  if v_required_quiz_lessons > 0 then
    v_target_lessons := v_required_quiz_lessons;

    select count(distinct lqc.lesson_id)::integer
    into v_completed_lessons
    from public.lesson_quiz_completions lqc
    join public.quizzes q on q.id = lqc.quiz_id
    where lqc.user_id = p_user_id
      and q.course_id = v_course_id
      and q.is_required = true;
  else
    v_target_lessons := greatest(v_total_lessons, 0);

    select count(distinct lqc.lesson_id)::integer
    into v_completed_lessons
    from public.lesson_quiz_completions lqc
    join public.lessons l on l.id = lqc.lesson_id
    where lqc.user_id = p_user_id
      and l.course_id = v_course_id;
  end if;

  if v_target_lessons <= 0 then
    v_progress := 0;
  else
    v_progress := least(100, greatest(0, round((v_completed_lessons::numeric / v_target_lessons::numeric) * 100, 2)));
  end if;

  v_completed := (v_progress >= 100);

  select ce.id
  into v_enrollment_id
  from public.course_enrollments ce
  where ce.user_id = p_user_id
    and ce.course_id = v_course_id
  limit 1;

  if v_enrollment_id is null then
    insert into public.course_enrollments (user_id, course_id)
    values (p_user_id, v_course_id)
    returning id into v_enrollment_id;
  end if;

  update public.course_progress cp
  set progress_percentage = v_progress,
      completed = v_completed,
      completed_at = case when v_completed then now() else null end,
      last_accessed = now(),
      updated_at = now()
  where cp.enrollment_id = v_enrollment_id;

  if not found then
    insert into public.course_progress (
      enrollment_id,
      progress_percentage,
      completed,
      completed_at,
      last_accessed,
      updated_at
    )
    values (
      v_enrollment_id,
      v_progress,
      v_completed,
      case when v_completed then now() else null end,
      now(),
      now()
    );
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- RLS + policies
-- -----------------------------------------------------------------------------

alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.lesson_downloads enable row level security;
alter table public.lesson_quiz_completions enable row level security;
alter table public.course_media enable row level security;
alter table public.site_settings enable row level security;
alter table public.programs enable row level security;
alter table public.program_courses enable row level security;
alter table public.program_enrollments enable row level security;

-- Public read policies for learner-facing tables
drop policy if exists "Public can view quizzes" on public.quizzes;
create policy "Public can view quizzes"
on public.quizzes for select
using (true);

drop policy if exists "Public can view quiz questions" on public.quiz_questions;
create policy "Public can view quiz questions"
on public.quiz_questions for select
using (true);

drop policy if exists "Public can view lesson downloads" on public.lesson_downloads;
create policy "Public can view lesson downloads"
on public.lesson_downloads for select
using (true);

drop policy if exists "Public can view course media" on public.course_media;
create policy "Public can view course media"
on public.course_media for select
using (true);

drop policy if exists "Site settings public read" on public.site_settings;
create policy "Site settings public read"
on public.site_settings for select
to anon, authenticated
using (true);

drop policy if exists "Public can view published programs" on public.programs;
create policy "Public can view published programs"
on public.programs for select
using (status = 'published');

drop policy if exists "Public can view published program courses" on public.program_courses;
create policy "Public can view published program courses"
on public.program_courses for select
using (
  exists (
    select 1
    from public.programs p
    where p.id = program_id
      and p.status = 'published'
  )
);

-- User quiz completion policies
drop policy if exists "Users can insert own quiz completions" on public.lesson_quiz_completions;
create policy "Users can insert own quiz completions"
on public.lesson_quiz_completions for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can view own quiz completions" on public.lesson_quiz_completions;
create policy "Users can view own quiz completions"
on public.lesson_quiz_completions for select
to authenticated
using (auth.uid() = user_id);

-- Program enrollment user policies
drop policy if exists "Users can view own program enrollments" on public.program_enrollments;
create policy "Users can view own program enrollments"
on public.program_enrollments for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own program enrollments" on public.program_enrollments;
create policy "Users can insert own program enrollments"
on public.program_enrollments for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own program enrollments" on public.program_enrollments;
create policy "Users can update own program enrollments"
on public.program_enrollments for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Admin policies based on profiles.role
drop policy if exists "Admins manage quizzes" on public.quizzes;
create policy "Admins manage quizzes"
on public.quizzes for all
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

drop policy if exists "Admins manage quiz questions" on public.quiz_questions;
create policy "Admins manage quiz questions"
on public.quiz_questions for all
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

drop policy if exists "Admins manage lesson downloads" on public.lesson_downloads;
create policy "Admins manage lesson downloads"
on public.lesson_downloads for all
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

drop policy if exists "Admins manage course media" on public.course_media;
create policy "Admins manage course media"
on public.course_media for all
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

drop policy if exists "Admins write site settings" on public.site_settings;
create policy "Admins write site settings"
on public.site_settings for all
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

drop policy if exists "Admins manage programs" on public.programs;
create policy "Admins manage programs"
on public.programs for all
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

drop policy if exists "Admins manage program courses" on public.program_courses;
create policy "Admins manage program courses"
on public.program_courses for all
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

insert into public.site_settings (id)
values (1)
on conflict (id) do nothing;
