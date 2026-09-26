-- Live class system: schedules, registrations, payments, and admin controls.

create table if not exists public.live_classes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  instructor_name text not null,
  instructor_bio text,
  instructor_avatar_url text,
  cover_image_url text,
  meeting_platform text not null default 'Zoom',
  meeting_url text,
  start_at timestamptz not null,
  end_at timestamptz,
  timezone text not null default 'Africa/Addis_Ababa',
  price numeric(10,2) not null default 0 check (price >= 0),
  currency text not null default 'ETB',
  seats_total integer check (seats_total is null or seats_total > 0),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  registration_status text not null default 'open' check (registration_status in ('open', 'closed')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.live_class_registrations (
  id uuid primary key default gen_random_uuid(),
  live_class_id uuid not null references public.live_classes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  payment_status text not null default 'paid' check (payment_status in ('pending', 'paid', 'failed', 'refunded')),
  payment_method text not null default 'demo_checkout',
  payment_reference text,
  amount_paid numeric(10,2) not null default 0 check (amount_paid >= 0),
  registration_status text not null default 'registered' check (registration_status in ('registered', 'cancelled', 'waitlisted')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (live_class_id, user_id)
);

create index if not exists idx_live_classes_status_start_at on public.live_classes (status, start_at);
create index if not exists idx_live_classes_registration_status on public.live_classes (registration_status);
create index if not exists idx_live_class_registrations_user_id on public.live_class_registrations (user_id);
create index if not exists idx_live_class_registrations_live_class_id on public.live_class_registrations (live_class_id);
create index if not exists idx_live_class_registrations_created_at on public.live_class_registrations (created_at desc);

create or replace function public.set_live_class_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_live_classes_updated_at
before update on public.live_classes
for each row
execute function public.set_live_class_updated_at();

create trigger trg_live_class_registrations_updated_at
before update on public.live_class_registrations
for each row
execute function public.set_live_class_updated_at();

alter table public.live_classes enable row level security;
alter table public.live_class_registrations enable row level security;

drop policy if exists "Live classes: public read published" on public.live_classes;
create policy "Live classes: public read published"
on public.live_classes
for select
to anon, authenticated
using (
  status = 'published'
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and lower(coalesce(p.role, '')) = 'admin'
  )
);

drop policy if exists "Live classes: admin manage" on public.live_classes;
create policy "Live classes: admin manage"
on public.live_classes
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and lower(coalesce(p.role, '')) = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and lower(coalesce(p.role, '')) = 'admin'
  )
);

drop policy if exists "Live registrations: user read own" on public.live_class_registrations;
create policy "Live registrations: user read own"
on public.live_class_registrations
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Live registrations: admin manage" on public.live_class_registrations;
create policy "Live registrations: admin manage"
on public.live_class_registrations
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and lower(coalesce(p.role, '')) = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and lower(coalesce(p.role, '')) = 'admin'
  )
);

create or replace function public.register_live_class(
  p_user_id uuid,
  p_live_class_id uuid,
  p_payment_method text default 'demo_checkout',
  p_amount_paid numeric default null,
  p_payment_reference text default null,
  p_notes text default null
)
returns table(status text, registration_id uuid, live_class_id uuid, amount_paid numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_class public.live_classes%rowtype;
  v_existing_registration_id uuid;
  v_registration_id uuid;
  v_amount_paid numeric(10,2);
begin
  if p_user_id is null or p_live_class_id is null then
    return query select 'invalid_input'::text, null::uuid, null::uuid, null::numeric;
    return;
  end if;

  select *
    into v_class
  from public.live_classes
  where live_classes.id = p_live_class_id
  limit 1;

  if not found then
    return query select 'class_not_found'::text, null::uuid, null::uuid, null::numeric;
    return;
  end if;

  if v_class.status <> 'published' then
    return query select 'class_unavailable'::text, null::uuid, v_class.id, null::numeric;
    return;
  end if;

  if v_class.registration_status <> 'open' then
    return query select 'registration_closed'::text, null::uuid, v_class.id, null::numeric;
    return;
  end if;

  select id
    into v_existing_registration_id
  from public.live_class_registrations
  where live_class_registrations.live_class_id = p_live_class_id
    and live_class_registrations.user_id = p_user_id
  limit 1;

  if v_existing_registration_id is not null then
    return query select 'already_registered'::text, v_existing_registration_id, v_class.id, coalesce(p_amount_paid, v_class.price)::numeric;
    return;
  end if;

  v_amount_paid := coalesce(p_amount_paid, v_class.price, 0)::numeric(10,2);

  if v_amount_paid < coalesce(v_class.price, 0) then
    return query select 'insufficient_payment'::text, null::uuid, v_class.id, v_amount_paid;
    return;
  end if;

  insert into public.live_class_registrations (
    live_class_id,
    user_id,
    payment_status,
    payment_method,
    payment_reference,
    amount_paid,
    registration_status,
    notes
  )
  values (
    p_live_class_id,
    p_user_id,
    'paid',
    coalesce(nullif(trim(p_payment_method), ''), 'demo_checkout'),
    nullif(trim(p_payment_reference), ''),
    v_amount_paid,
    'registered',
    nullif(trim(p_notes), '')
  )
  returning id into v_registration_id;

  return query select 'registered'::text, v_registration_id, v_class.id, v_amount_paid;
end;
$$;
