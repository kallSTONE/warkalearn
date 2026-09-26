-- Auto-claim referral on profile creation from auth metadata.
-- This closes the gap where email signup stores referral_code but never calls claim_referral_invite.

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
  select nullif(trim(u.raw_user_meta_data ->> 'referral_code'), '')
    into v_referral_code
  from auth.users u
  where u.id = p_user_id;

  if v_referral_code is null then
    return 'no_code';
  end if;

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

create or replace function public.handle_profile_referral_claim()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.claim_referral_from_auth_metadata(new.id);
  return new;
end;
$$;

drop trigger if exists on_profile_created_referral_claim on public.profiles;
create trigger on_profile_created_referral_claim
after insert on public.profiles
for each row
execute procedure public.handle_profile_referral_claim();

-- Backfill old users that have referral_code metadata but no invite record yet.
with candidates as (
  select
    p.id as user_id,
    nullif(trim(u.raw_user_meta_data ->> 'referral_code'), '') as referral_code
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
