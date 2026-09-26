-- One-time referral reward codes for free-course enrollment.
-- Admin issues codes when approving reward requests; learners redeem a code for a course.

create table if not exists public.referral_reward_codes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.referral_reward_requests(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  code text not null,
  status text not null default 'active' check (status in ('active', 'used', 'expired', 'revoked')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  used_at timestamptz,
  used_by_user_id uuid references public.profiles(id) on delete set null,
  used_for_course_id integer references public.courses(id) on delete set null,
  revoked_at timestamptz,
  revoked_by uuid references public.profiles(id) on delete set null,
  revoked_reason text
);

create unique index if not exists idx_referral_reward_codes_code_upper_unique
  on public.referral_reward_codes (upper(code));

create index if not exists idx_referral_reward_codes_user_status
  on public.referral_reward_codes (user_id, status, created_at desc);

create index if not exists idx_referral_reward_codes_request
  on public.referral_reward_codes (request_id);

alter table if exists public.referral_reward_codes enable row level security;

drop policy if exists "Referral reward codes: user read own" on public.referral_reward_codes;
create policy "Referral reward codes: user read own"
on public.referral_reward_codes
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Referral reward codes: admin manage" on public.referral_reward_codes;
create policy "Referral reward codes: admin manage"
on public.referral_reward_codes
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

create or replace function public.redeem_referral_reward_code(
  p_user_id uuid,
  p_code text,
  p_course_id integer
)
returns table(status text, enrollment_id uuid, reward_code_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code public.referral_reward_codes%rowtype;
  v_existing_enrollment_id uuid;
  v_new_enrollment_id uuid;
  v_course_exists boolean;
begin
  if p_user_id is null or p_code is null or p_course_id is null then
    return query select 'invalid_input'::text, null::uuid, null::uuid;
    return;
  end if;

  select exists(
    select 1
    from public.courses c
    where c.id = p_course_id
  ) into v_course_exists;

  if not v_course_exists then
    return query select 'course_not_found'::text, null::uuid, null::uuid;
    return;
  end if;

  select rrc.*
    into v_code
  from public.referral_reward_codes rrc
  where upper(rrc.code) = upper(trim(p_code))
  limit 1
  for update;

  if not found then
    return query select 'invalid_code'::text, null::uuid, null::uuid;
    return;
  end if;

  if v_code.user_id <> p_user_id then
    return query select 'not_owner'::text, null::uuid, v_code.id;
    return;
  end if;

  if v_code.status <> 'active' then
    return query select 'code_not_active'::text, null::uuid, v_code.id;
    return;
  end if;

  if v_code.expires_at is not null and v_code.expires_at < now() then
    update public.referral_reward_codes
    set status = 'expired'
    where id = v_code.id;

    return query select 'code_expired'::text, null::uuid, v_code.id;
    return;
  end if;

  select ce.id
    into v_existing_enrollment_id
  from public.course_enrollments ce
  where ce.user_id = p_user_id
    and ce.course_id = p_course_id
  limit 1;

  if v_existing_enrollment_id is not null then
    return query select 'already_enrolled'::text, v_existing_enrollment_id, v_code.id;
    return;
  end if;

  insert into public.course_enrollments (user_id, course_id)
  values (p_user_id, p_course_id)
  returning id into v_new_enrollment_id;

  insert into public.course_progress (
    enrollment_id,
    progress_percentage,
    completed,
    last_accessed,
    updated_at
  )
  values (
    v_new_enrollment_id,
    0,
    false,
    now(),
    now()
  )
  on conflict (enrollment_id) do update
    set progress_percentage = excluded.progress_percentage,
        completed = excluded.completed,
        last_accessed = excluded.last_accessed,
        updated_at = excluded.updated_at;

  update public.referral_reward_codes
  set status = 'used',
      used_at = now(),
      used_by_user_id = p_user_id,
      used_for_course_id = p_course_id
  where id = v_code.id;

  return query select 'redeemed'::text, v_new_enrollment_id, v_code.id;
end;
$$;
