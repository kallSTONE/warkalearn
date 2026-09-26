-- Enable UUID extension (safe if already enabled)
create extension if not exists "pgcrypto";

create table if not exists public.programs (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    slug text not null unique,
    description text,
    thumbnail text,
    status text not null default 'draft'
        check (status in ('draft', 'published')),
    price numeric(10,2),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Index for filtering published programs
create index if not exists idx_programs_status
on public.programs(status);





create table public.program_courses (
    id uuid primary key default gen_random_uuid(),
    program_id uuid not null
        references public.programs(id)
        on delete cascade,

    course_id integer not null
        references public.courses(id)
        on delete restrict,

    sort_order integer not null default 0,
    is_required boolean not null default true,
    created_at timestamptz not null default now(),

    unique(program_id, course_id)
);

create index idx_program_courses_program
on public.program_courses(program_id);

create index idx_program_courses_course
on public.program_courses(course_id);






create table if not exists public.program_enrollments (
    id uuid primary key default gen_random_uuid(),
    program_id uuid not null references public.programs(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    status text not null default 'active'
        check (status in ('active', 'completed', 'dropped')),
    progress_percentage numeric(5,2) not null default 0,
    started_at timestamptz default now(),
    completed_at timestamptz,
    created_at timestamptz not null default now(),

    unique(program_id, user_id)
);

create index if not exists idx_program_enrollments_user
on public.program_enrollments(user_id);

create index if not exists idx_program_enrollments_program
on public.program_enrollments(program_id);








create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger set_programs_updated_at
before update on public.programs
for each row
execute procedure public.handle_updated_at();





alter table public.programs enable row level security;
alter table public.program_courses enable row level security;
alter table public.program_enrollments enable row level security;





create policy "Public can view published programs"
on public.programs
for select
using (status = 'published');



create policy "Public can view program courses"
on public.program_courses
for select
using (
    exists (
        select 1 from public.programs p
        where p.id = program_id
        and p.status = 'published'
    )
);



create policy "Users can view own enrollments"
on public.program_enrollments
for select
using (auth.uid() = user_id);



create policy "Users can enroll themselves"
on public.program_enrollments
for insert
with check (auth.uid() = user_id);



create policy "Users can update own enrollment"
on public.program_enrollments
for update
using (auth.uid() = user_id);



create policy "Admins can manage programs"
on public.programs
for all
using (auth.jwt() ->> 'role' = 'admin')
with check (auth.jwt() ->> 'role' = 'admin');

create policy "Admins can manage program courses"
on public.program_courses
for all
using (auth.jwt() ->> 'role' = 'admin')
with check (auth.jwt() ->> 'role' = 'admin');



create or replace function public.calculate_program_progress(p_user_id uuid, p_program_id uuid)
returns numeric as $$
declare
    total_required integer;
    completed integer;
begin
    -- Count required courses
    select count(*)
    into total_required
    from public.program_courses
    where program_id = p_program_id
    and is_required = true;

    -- Count completed courses
    select count(*)
    into completed
    from public.program_courses pc
    join public.course_enrollments ce
        on ce.course_id = pc.course_id
    where pc.program_id = p_program_id
    and pc.is_required = true
    and ce.user_id = p_user_id
    and ce.status = 'completed';

    if total_required = 0 then
        return 0;
    end if;

    return (completed::numeric / total_required::numeric) * 100;
end;
$$ language plpgsql security definer;


