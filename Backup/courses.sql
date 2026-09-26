create table public.courses (
  id serial not null,
  title character varying(255) not null,
  slug character varying(255) not null,
  description text null,
  hero_image text null,
  category character varying(50) null,
  level character varying(50) null,
  estimated_hours integer null,
  requirements text null,
  skills text null,
  students integer null default 0,
  rating numeric(2, 1) null default 0,
  featured boolean null default false,
  created_at timestamp without time zone null default now(),
  status text null default 'published'::text,
  published boolean null default false,
  is_paid boolean not null default false,
  constraint courses_pkey primary key (id),
  constraint courses_slug_key unique (slug)
) TABLESPACE pg_default;

create index IF not exists courses_status_idx on public.courses using btree (status) TABLESPACE pg_default;

create index IF not exists courses_published_idx on public.courses using btree (published) TABLESPACE pg_default;