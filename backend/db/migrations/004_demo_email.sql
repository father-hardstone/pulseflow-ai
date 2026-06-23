-- Demo email delivery: Mailtrap sandbox vs real test inboxes (Resend sender)

alter table public.app_users
  add column if not exists demo_email_target varchar not null default 'mailtrap';

create table if not exists public.user_demo_recipients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  first_name varchar not null default '',
  last_name varchar not null default '',
  email varchar not null,
  created_at timestamptz not null default now(),
  unique (user_id, email)
);

create index if not exists user_demo_recipients_user_id_idx
  on public.user_demo_recipients (user_id);
