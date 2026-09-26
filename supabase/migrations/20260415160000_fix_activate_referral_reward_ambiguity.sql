-- Fix ambiguous column references in activate_referral_reward.
-- In PL/pgSQL, output columns (like user_id) are variables, so unqualified
-- references can conflict with table columns.

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

  select rr.*
    into v_request
  from public.referral_reward_requests as rr
  where rr.id = p_request_id
  for update;

  if not found then
    return query select 'not_found'::text, null::uuid, 0;
    return;
  end if;

  if v_request.status <> 'pending' then
    return query select 'already_handled'::text, v_request.user_id, 0;
    return;
  end if;

  select rp.*
    into v_profile
  from public.referral_profiles as rp
  where rp.user_id = v_request.user_id
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

  update public.referral_profiles as rp
  set free_courses_awarded = rp.free_courses_awarded + v_request.free_courses_to_award,
      updated_at = now()
  where rp.user_id = v_request.user_id;

  update public.referral_reward_requests as rr
  set status = 'activated',
      handled_at = now(),
      handled_by = p_admin_user_id
  where rr.id = p_request_id;

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
