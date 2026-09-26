create table if not exists public.site_settings (
  id integer primary key default 1,
  hero_title text,
  hero_subtitle text,
  hero_cta_text text,
  hero_cta_link text,
  hero_video_id text,
  default_theme text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint site_settings_singleton check (id = 1)
);

create or replace function public.update_site_settings_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_site_settings_updated_at
before update on public.site_settings
for each row execute function public.update_site_settings_updated_at();

alter table public.site_settings enable row level security;

drop policy if exists "Site settings: public read" on public.site_settings;
create policy "Site settings: public read" on public.site_settings
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Site settings: admin write" on public.site_settings;
create policy "Site settings: admin write" on public.site_settings
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

insert into public.site_settings (id)
values (1)
on conflict (id) do nothing;
