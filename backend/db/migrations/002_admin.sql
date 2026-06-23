-- Run after the base schema if app_users already exists without is_active.
alter table public.app_users
  add column if not exists is_active boolean not null default true;

create table if not exists public.app_admins (
  id uuid primary key default gen_random_uuid(),
  email varchar not null unique,
  password_hash text not null,
  full_name varchar,
  role varchar not null default 'admin',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
