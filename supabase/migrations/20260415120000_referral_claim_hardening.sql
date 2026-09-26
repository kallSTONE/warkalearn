-- Harden referral auto-claim behavior and normalization.
-- Ensures referral_code metadata is normalized before claiming.

-- Recreate claim_referral_invite with qualified column references.
-- In PL/pgSQL, output column names are variables, so unqualified
-- references like referrer_user_id can become ambiguous.
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

  select rss.is_active
    into v_system_active
  from public.referral_system_settings as rss
  where rss.id = true;

  if coalesce(v_system_active, true) is false then
    return query select 'system_inactive'::text, null::uuid;
    return;
  end if;

  select ri.referrer_user_id
    into v_existing_referrer
  from public.referral_invites as ri
  where ri.referred_user_id = p_referred_user_id;

  if v_existing_referrer is not null then
    return query select 'already_claimed'::text, v_existing_referrer;
    return;
  end if;

  select rp.user_id
    into v_referrer_id
  from public.referral_profiles as rp
  where upper(rp.referral_code) = upper(trim(p_referral_code))
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

create or replace function public.claim_referral_from_auth_metadata(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referral_code text;
  v_claim_status text;
begin
  select nullif(upper(trim(u.raw_user_meta_data ->> 'referral_code')), '')
    into v_referral_code
  from auth.users u
  where u.id = p_user_id;

  if v_referral_code is null then
    return 'no_code';
  end if;

  -- Defensive bootstrap in case referral profile bootstrap trigger was skipped.
  perform public.ensure_referral_profile_for_user(p_user_id);

  select claimed.status
    into v_claim_status
  from public.claim_referral_invite(p_user_id, v_referral_code, 100) as claimed
  limit 1;

  return coalesce(v_claim_status, 'unknown');
exception
  when others then
    raise warning 'claim_referral_from_auth_metadata failed for user %: %', p_user_id, sqlerrm;
    return 'error';
end;
$$;

-- Strengthen code uniqueness in case mixed-case rows were manually inserted.
create unique index if not exists idx_referral_profiles_referral_code_upper_unique
  on public.referral_profiles (upper(referral_code));

-- Re-run backfill for users that have metadata referral code but still no invite row.
with candidates as (
  select
    p.id as user_id,
    nullif(upper(trim(u.raw_user_meta_data ->> 'referral_code')), '') as referral_code
  from public.profiles p
  join auth.users u
    on u.id = p.id
  left join public.referral_invites ri
    on ri.referred_user_id = p.id
  where ri.referred_user_id is null
)
select public.claim_referral_invite(c.user_id, c.referral_code, 100)
from candidates c
where c.referral_code is not null;
