-- Shop commerce foundation: products, cart, orders, and fake checkout RPC.

create table if not exists public.shop_products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  short_description text,
  description text,
  category text not null,
  image_url text,
  price_etb numeric(10,2) not null check (price_etb >= 0),
  rating numeric(3,2) not null default 0 check (rating >= 0 and rating <= 5),
  review_count integer not null default 0 check (review_count >= 0),
  is_active boolean not null default true,
  is_featured boolean not null default false,
  is_bestseller boolean not null default false,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shop_cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.shop_products(id) on delete cascade,
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create table if not exists public.shop_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'paid' check (status in ('paid', 'cancelled', 'refunded')),
  payment_method text not null default 'fake_checkout',
  payment_reference text,
  currency text not null default 'ETB',
  subtotal numeric(10,2) not null check (subtotal >= 0),
  total_amount numeric(10,2) not null check (total_amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shop_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.shop_orders(id) on delete cascade,
  product_id uuid not null references public.shop_products(id) on delete restrict,
  product_name text not null,
  unit_price numeric(10,2) not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  line_total numeric(10,2) not null check (line_total >= 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_shop_products_active_category on public.shop_products (is_active, category);
create index if not exists idx_shop_cart_items_user_id on public.shop_cart_items (user_id);
create index if not exists idx_shop_orders_user_id_created_at on public.shop_orders (user_id, created_at desc);
create index if not exists idx_shop_order_items_order_id on public.shop_order_items (order_id);

-- Timestamp trigger helper scoped to shop tables.
create or replace function public.set_shop_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_shop_products_updated_at
before update on public.shop_products
for each row
execute function public.set_shop_updated_at();

create trigger trg_shop_cart_items_updated_at
before update on public.shop_cart_items
for each row
execute function public.set_shop_updated_at();

create trigger trg_shop_orders_updated_at
before update on public.shop_orders
for each row
execute function public.set_shop_updated_at();

alter table public.shop_products enable row level security;
alter table public.shop_cart_items enable row level security;
alter table public.shop_orders enable row level security;
alter table public.shop_order_items enable row level security;

drop policy if exists "Shop products: public read active" on public.shop_products;
create policy "Shop products: public read active"
on public.shop_products
for select
to anon, authenticated
using (
  is_active = true
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "Shop products: admin manage" on public.shop_products;
create policy "Shop products: admin manage"
on public.shop_products
for all
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "Shop cart: user read own" on public.shop_cart_items;
create policy "Shop cart: user read own"
on public.shop_cart_items
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Shop cart: user add own" on public.shop_cart_items;
create policy "Shop cart: user add own"
on public.shop_cart_items
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Shop cart: user update own" on public.shop_cart_items;
create policy "Shop cart: user update own"
on public.shop_cart_items
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Shop cart: user delete own" on public.shop_cart_items;
create policy "Shop cart: user delete own"
on public.shop_cart_items
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "Shop orders: user read own" on public.shop_orders;
create policy "Shop orders: user read own"
on public.shop_orders
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Shop orders: user create own" on public.shop_orders;
create policy "Shop orders: user create own"
on public.shop_orders
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Shop order items: user read own" on public.shop_order_items;
create policy "Shop order items: user read own"
on public.shop_order_items
for select
to authenticated
using (
  exists (
    select 1
    from public.shop_orders o
    where o.id = shop_order_items.order_id
      and o.user_id = auth.uid()
  )
);

drop policy if exists "Shop order items: user create own" on public.shop_order_items;
create policy "Shop order items: user create own"
on public.shop_order_items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.shop_orders o
    where o.id = shop_order_items.order_id
      and o.user_id = auth.uid()
  )
);

create or replace function public.checkout_shop_cart(p_payment_method text default 'fake_checkout')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_order_id uuid;
  v_subtotal numeric(10,2);
begin
  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if not exists (
    select 1
    from public.shop_cart_items c
    where c.user_id = v_user_id
  ) then
    raise exception 'Cart is empty.';
  end if;

  if exists (
    select 1
    from public.shop_cart_items c
    join public.shop_products p on p.id = c.product_id
    where c.user_id = v_user_id
      and (p.is_active = false or p.stock_quantity < c.quantity)
  ) then
    raise exception 'Some items are unavailable or out of stock.';
  end if;

  select coalesce(sum((p.price_etb * c.quantity)::numeric), 0)::numeric(10,2)
  into v_subtotal
  from public.shop_cart_items c
  join public.shop_products p on p.id = c.product_id
  where c.user_id = v_user_id;

  insert into public.shop_orders (
    user_id,
    status,
    payment_method,
    subtotal,
    total_amount
  )
  values (
    v_user_id,
    'paid',
    coalesce(nullif(trim(p_payment_method), ''), 'fake_checkout'),
    v_subtotal,
    v_subtotal
  )
  returning id into v_order_id;

  insert into public.shop_order_items (
    order_id,
    product_id,
    product_name,
    unit_price,
    quantity,
    line_total
  )
  select
    v_order_id,
    p.id,
    p.name,
    p.price_etb,
    c.quantity,
    (p.price_etb * c.quantity)::numeric(10,2)
  from public.shop_cart_items c
  join public.shop_products p on p.id = c.product_id
  where c.user_id = v_user_id;

  update public.shop_products p
  set stock_quantity = p.stock_quantity - c.quantity
  from public.shop_cart_items c
  where c.user_id = v_user_id
    and p.id = c.product_id;

  delete from public.shop_cart_items
  where user_id = v_user_id;

  return v_order_id;
end;
$$;

grant execute on function public.checkout_shop_cart(text) to authenticated;

insert into public.shop_products (
  slug,
  name,
  short_description,
  description,
  category,
  image_url,
  price_etb,
  rating,
  review_count,
  is_active,
  is_featured,
  is_bestseller,
  stock_quantity
)
values
  (
    'speaking-confidence-workbook',
    'Speaking Confidence Workbook',
    'Guided prompts and reflection tasks to build fluency fast.',
    'A structured workbook with confidence drills, speaking prompts, role-play scripts, and weekly self-reviews. Great for learners who want to speak naturally in meetings, interviews, and daily interactions.',
    'Books',
    'https://images.pexels.com/photos/1329571/pexels-photo-1329571.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    850,
    4.5,
    24,
    true,
    false,
    true,
    40
  ),
  (
    'business-email-template-pack',
    'Business Email Template Pack',
    'Ready-to-use templates for common workplace emails.',
    'Professional email templates for follow-ups, meeting requests, status updates, and escalation messages with tone guidance so you can sound clear and polite.',
    'Templates',
    'https://images.pexels.com/photos/4195342/pexels-photo-4195342.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    350,
    4.8,
    56,
    true,
    false,
    false,
    120
  ),
  (
    'pronunciation-audio-course',
    'Pronunciation Audio Course',
    'Daily listening and repetition drills for better clarity.',
    'A 30-day audio-based pronunciation system focused on stress, rhythm, and common mispronunciations. Includes short practice scripts and progress checklists.',
    'Courses',
    'https://images.pexels.com/photos/3059748/pexels-photo-3059748.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    1200,
    4.7,
    38,
    true,
    true,
    false,
    55
  ),
  (
    'interview-prep-kit',
    'Interview Prep Kit',
    'Question bank, answer structures, and sample responses.',
    'Interview prep resources with scenario-based questions, role-specific answer formulas, and concise examples to improve confidence before job interviews.',
    'Resources',
    'https://images.pexels.com/photos/5673488/pexels-photo-5673488.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    650,
    4.6,
    19,
    true,
    false,
    false,
    70
  ),
  (
    'presentation-slide-template-pack',
    'Presentation Slide Template Pack',
    'Clean professional slides with storytelling cues.',
    'A practical slide library for business and education presentations with editable sections, visual pacing tips, and speaking prompts per slide.',
    'Templates',
    'https://images.pexels.com/photos/1779487/pexels-photo-1779487.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    800,
    4.9,
    42,
    true,
    false,
    true,
    65
  ),
  (
    'vocabulary-builder-journal',
    'Vocabulary Builder Journal',
    'Daily logs and review pages to retain new words.',
    'A compact journal system with theme-based vocabulary pages, spaced repetition checkpoints, and sentence practice sections for long-term retention.',
    'Books',
    'https://images.pexels.com/photos/4439901/pexels-photo-4439901.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    450,
    4.4,
    31,
    true,
    false,
    false,
    90
  )
on conflict (slug) do update
set
  name = excluded.name,
  short_description = excluded.short_description,
  description = excluded.description,
  category = excluded.category,
  image_url = excluded.image_url,
  price_etb = excluded.price_etb,
  rating = excluded.rating,
  review_count = excluded.review_count,
  is_active = excluded.is_active,
  is_featured = excluded.is_featured,
  is_bestseller = excluded.is_bestseller,
  stock_quantity = excluded.stock_quantity,
  updated_at = now();
