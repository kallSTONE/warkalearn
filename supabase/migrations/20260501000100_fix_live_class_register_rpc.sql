-- Fix ambiguity in live class registration RPC.

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

  select lc.*
    into v_class
  from public.live_classes as lc
  where lc.id = p_live_class_id
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

  select lcr.id
    into v_existing_registration_id
  from public.live_class_registrations as lcr
  where lcr.live_class_id = p_live_class_id
    and lcr.user_id = p_user_id
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
