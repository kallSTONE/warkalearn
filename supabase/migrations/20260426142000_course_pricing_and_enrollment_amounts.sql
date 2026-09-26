-- Add course pricing and enrollment payment capture for analytics and coupon support.

alter table public.courses
  add column if not exists price numeric(10,2);

alter table public.courses
  drop constraint if exists courses_price_non_negative;

alter table public.courses
  add constraint courses_price_non_negative
  check (price is null or price >= 0);

-- Seed paid courses with a default price where missing.
update public.courses
set price = 3000
where is_paid = true
  and (price is null or price <= 0);

alter table public.course_enrollments
  add column if not exists amount_paid numeric(10,2) not null default 0;

alter table public.course_enrollments
  drop constraint if exists course_enrollments_amount_paid_non_negative;

alter table public.course_enrollments
  add constraint course_enrollments_amount_paid_non_negative
  check (amount_paid >= 0);

-- Backfill historical enrollments for paid courses.
update public.course_enrollments ce
set amount_paid = coalesce(c.price, 3000)
from public.courses c
where c.id = ce.course_id
  and c.is_paid = true
  and ce.amount_paid = 0;

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

  -- Reward code enrollments are always free.
  insert into public.course_enrollments (user_id, course_id, amount_paid)
  values (p_user_id, p_course_id, 0)
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
