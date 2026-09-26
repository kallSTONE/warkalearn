create extension if not exists pgcrypto;

create table if not exists public.phone_registration_tickets (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  phone_e164 text not null,
  full_name text not null,
  password_encrypted text not null,
  referral_code text,
  requested_ip inet,
  user_agent text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz
);

create index if not exists idx_phone_registration_tickets_phone_created
  on public.phone_registration_tickets (phone_e164, created_at desc);

create index if not exists idx_phone_registration_tickets_expires_at
  on public.phone_registration_tickets (expires_at);

alter table public.phone_registration_tickets enable row level security;