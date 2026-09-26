-- Referral security and bootstrap hardening.
-- Adds RLS policies and automatic referral profile provisioning.

alter table if exists public.referral_system_settings enable row level security;
alter table if exists public.referral_profiles enable row level security;
alter table if exists public.referral_invites enable row level security;
alter table if exists public.referral_reward_requests enable row level security;
alter table if exists public.referral_reward_activations enable row level security;

-- System settings policies

drop policy if exists "Referral settings: authenticated read" on public.referral_system_settings;
create policy "Referral settings: authenticated read"
on public.referral_system_settings
for select
to authenticated
using (true);

drop policy if exists "Referral settings: admin manage" on public.referral_system_settings;
create policy "Referral settings: admin manage"
on public.referral_system_settings
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

-- Referral profile policies

drop policy if exists "Referral profiles: user read own" on public.referral_profiles;
create policy "Referral profiles: user read own"
on public.referral_profiles
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Referral profiles: admin read all" on public.referral_profiles;
create policy "Referral profiles: admin read all"
on public.referral_profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and lower(coalesce(p.role, '')) = 'admin'
  )
);

-- Referral invites policies

drop policy if exists "Referral invites: user read own side" on public.referral_invites;
create policy "Referral invites: user read own side"
on public.referral_invites
for select
to authenticated
using (
  referrer_user_id = auth.uid()
  or referred_user_id = auth.uid()
);

drop policy if exists "Referral invites: admin read all" on public.referral_invites;
create policy "Referral invites: admin read all"
on public.referral_invites
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and lower(coalesce(p.role, '')) = 'admin'
  )
);

-- Reward request policies

drop policy if exists "Referral reward requests: user read own" on public.referral_reward_requests;
create policy "Referral reward requests: user read own"
on public.referral_reward_requests
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Referral reward requests: user insert own" on public.referral_reward_requests;
create policy "Referral reward requests: user insert own"
on public.referral_reward_requests
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Referral reward requests: admin manage" on public.referral_reward_requests;
create policy "Referral reward requests: admin manage"
on public.referral_reward_requests
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

-- Reward activation policies

drop policy if exists "Referral reward activations: user read own" on public.referral_reward_activations;
create policy "Referral reward activations: user read own"
on public.referral_reward_activations
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Referral reward activations: admin manage" on public.referral_reward_activations;
create policy "Referral reward activations: admin manage"
on public.referral_reward_activations
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

create index if not exists idx_referral_reward_requests_status_requested_at
  on public.referral_reward_requests (status, requested_at desc);

create or replace function public.generate_referral_code_from_user_id(p_user_id uuid)
returns text
language sql
immutable
as $$
  select 'BRONQ-' || upper(substring(replace(p_user_id::text, '-', ''), 1, 8));
$$;

create or replace function public.ensure_referral_profile_for_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.referral_profiles (user_id, referral_code)
  values (p_user_id, public.generate_referral_code_from_user_id(p_user_id))
  on conflict (user_id) do nothing;
end;
$$;

create or replace function public.handle_new_referral_profile_bootstrap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ensure_referral_profile_for_user(new.id);
  return new;
end;
$$;

drop trigger if exists on_profile_created_referral_bootstrap on public.profiles;
create trigger on_profile_created_referral_bootstrap
after insert on public.profiles
for each row
execute procedure public.handle_new_referral_profile_bootstrap();

-- Backfill any missing referral profile rows for existing users.
insert into public.referral_profiles (user_id, referral_code)
select p.id, public.generate_referral_code_from_user_id(p.id)
from public.profiles p
left join public.referral_profiles rp on rp.user_id = p.id
where rp.user_id is null;
