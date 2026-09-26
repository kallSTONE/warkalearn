create extension if not exists pgcrypto;

create table if not exists public.referral_system_settings (
  id boolean primary key default true,
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

insert into public.referral_system_settings (id, is_active)
values (true, true)
on conflict (id) do nothing;

create table if not exists public.referral_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  referral_code text not null unique,
  referral_points integer not null default 0 check (referral_points >= 0),
  successful_invites integer not null default 0 check (successful_invites >= 0),
  free_courses_awarded integer not null default 0 check (free_courses_awarded >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_referral_profiles_code on public.referral_profiles (referral_code);

create table if not exists public.referral_invites (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id uuid not null references public.profiles(id) on delete cascade,
  referred_user_id uuid not null unique references public.profiles(id) on delete cascade,
  referral_code_used text not null,
  points_awarded integer not null default 100 check (points_awarded > 0),
  status text not null default 'qualified' check (status in ('qualified', 'rejected')),
  created_at timestamptz not null default now()
);

create index if not exists idx_referral_invites_referrer on public.referral_invites (referrer_user_id, created_at desc);

create table if not exists public.referral_reward_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  points_snapshot integer not null check (points_snapshot >= 0),
  free_courses_to_award integer not null check (free_courses_to_award > 0),
  status text not null default 'pending' check (status in ('pending', 'activated', 'rejected')),
  admin_note text,
  requested_at timestamptz not null default now(),
  handled_at timestamptz,
  handled_by uuid references public.profiles(id) on delete set null
);

create index if not exists idx_referral_reward_requests_user_status
  on public.referral_reward_requests (user_id, status, requested_at desc);

create table if not exists public.referral_reward_activations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.referral_reward_requests(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  free_courses_awarded integer not null check (free_courses_awarded > 0),
  activated_by uuid not null references public.profiles(id) on delete restrict,
  activated_at timestamptz not null default now()
);

create or replace function public.claim_referral_invite(
  p_referred_user_id uuid,
  p_referral_code text,
  p_points integer default 100
)
returns table(status text, referrer_user_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_system_active boolean;
  v_existing_referrer uuid;
  v_referrer_id uuid;
begin
  if p_referred_user_id is null or p_referral_code is null then
    return query select 'invalid_input'::text, null::uuid;
    return;
  end if;

  select is_active
    into v_system_active
  from public.referral_system_settings
  where id = true;

  if coalesce(v_system_active, true) is false then
    return query select 'system_inactive'::text, null::uuid;
    return;
  end if;

  select referrer_user_id
    into v_existing_referrer
  from public.referral_invites
  where referred_user_id = p_referred_user_id;

  if v_existing_referrer is not null then
    return query select 'already_claimed'::text, v_existing_referrer;
    return;
  end if;

  select user_id
    into v_referrer_id
  from public.referral_profiles
  where upper(referral_code) = upper(trim(p_referral_code))
  limit 1;

  if v_referrer_id is null then
    return query select 'invalid_code'::text, null::uuid;
    return;
  end if;

  if v_referrer_id = p_referred_user_id then
    return query select 'self_referral'::text, v_referrer_id;
    return;
  end if;

  insert into public.referral_invites (
    referrer_user_id,
    referred_user_id,
    referral_code_used,
    points_awarded,
    status
  )
  values (
    v_referrer_id,
    p_referred_user_id,
    upper(trim(p_referral_code)),
    p_points,
    'qualified'
  )
  on conflict (referred_user_id) do nothing;

  if not found then
    return query select 'already_claimed'::text, v_referrer_id;
    return;
  end if;

  update public.referral_profiles
  set referral_points = referral_points + p_points,
      successful_invites = successful_invites + 1,
      updated_at = now()
  where user_id = v_referrer_id;

  return query select 'claimed'::text, v_referrer_id;
end;
$$;

create or replace function public.activate_referral_reward(
  p_request_id uuid,
  p_admin_user_id uuid
)
returns table(status text, user_id uuid, free_courses_awarded integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.referral_reward_requests%rowtype;
  v_profile public.referral_profiles%rowtype;
  v_available integer;
begin
  if p_request_id is null or p_admin_user_id is null then
    return query select 'invalid_input'::text, null::uuid, 0;
    return;
  end if;

  select *
    into v_request
  from public.referral_reward_requests
  where id = p_request_id
  for update;

  if not found then
    return query select 'not_found'::text, null::uuid, 0;
    return;
  end if;

  if v_request.status <> 'pending' then
    return query select 'already_handled'::text, v_request.user_id, 0;
    return;
  end if;

  select *
    into v_profile
  from public.referral_profiles
  where user_id = v_request.user_id
  for update;

  if not found then
    return query select 'profile_missing'::text, v_request.user_id, 0;
    return;
  end if;

  v_available := floor(v_profile.referral_points / 300.0)::integer - v_profile.free_courses_awarded;

  if v_available < v_request.free_courses_to_award then
    return query select 'insufficient_eligible_courses'::text, v_request.user_id, 0;
    return;
  end if;

  update public.referral_profiles
  set free_courses_awarded = free_courses_awarded + v_request.free_courses_to_award,
      updated_at = now()
  where user_id = v_request.user_id;

  update public.referral_reward_requests
  set status = 'activated',
      handled_at = now(),
      handled_by = p_admin_user_id
  where id = p_request_id;

  insert into public.referral_reward_activations (
    request_id,
    user_id,
    free_courses_awarded,
    activated_by
  )
  values (
    p_request_id,
    v_request.user_id,
    v_request.free_courses_to_award,
    p_admin_user_id
  )
  on conflict (request_id) do nothing;

  return query select 'activated'::text, v_request.user_id, v_request.free_courses_to_award;
end;
$$;

alter table public.referral_system_settings enable row level security;
alter table public.referral_profiles enable row level security;
alter table public.referral_invites enable row level security;
alter table public.referral_reward_requests enable row level security;
alter table public.referral_reward_activations enable row level security;
