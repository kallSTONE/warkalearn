-- SMSPortal custom phone OTP support (hosted Supabase-compatible)

create extension if not exists pgcrypto;

create table if not exists public.phone_otp_challenges (
  id uuid primary key default gen_random_uuid(),
  phone_e164 text not null,
  purpose text not null default 'register',
  otp_hash text not null,
  attempts integer not null default 0,
  max_attempts integer not null default 5,
  requested_ip inet,
  user_agent text,
  sms_provider text not null default 'smsportal',
  provider_message_id text,
  provider_response jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz
);

create index if not exists idx_phone_otp_phone_purpose_created
  on public.phone_otp_challenges (phone_e164, purpose, created_at desc);

create index if not exists idx_phone_otp_expires_at
  on public.phone_otp_challenges (expires_at);

create table if not exists public.phone_verifications (
  phone_e164 text primary key,
  purpose text not null default 'register',
  verified_at timestamptz not null default now(),
  valid_until timestamptz not null,
  challenge_id uuid references public.phone_otp_challenges(id) on delete set null,
  consumed_at timestamptz
);

create index if not exists idx_phone_verifications_valid_until
  on public.phone_verifications (valid_until);

alter table public.phone_otp_challenges enable row level security;
alter table public.phone_verifications enable row level security;
