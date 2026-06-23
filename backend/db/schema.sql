-- PulseFlow AI - Supabase schema (SRS section 4)
-- Run in the Supabase SQL editor. Requires the vector extension (pgvector).

create extension if not exists vector;
create extension if not exists pgcrypto;

-- app_users: identity table for custom JWT auth (SRS Module E)
create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  email varchar not null unique,
  password_hash text not null,
  full_name varchar,
  is_active boolean not null default true,
  llm_provider varchar not null default 'gemini',
  demo_email_target varchar not null default 'mailtrap',
  created_at timestamptz not null default now()
);

-- test inboxes when demo_email_target = 'real' (max 4 per user, enforced in API)
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

-- app_admins: separate admin identity (admin JWT auth)
create table if not exists public.app_admins (
  id uuid primary key default gen_random_uuid(),
  email varchar not null unique,
  password_hash text not null,
  full_name varchar,
  role varchar not null default 'admin',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- knowledge_base: uploaded context documents
create table if not exists public.knowledge_base (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  source_url text,
  source_type varchar default 'text',
  title varchar not null default 'Untitled',
  status varchar not null default 'processing',
  created_at timestamptz not null default now()
);

-- document_chunks: vectorized pieces of data (384 dims = all-MiniLM-L6-v2)
create table if not exists public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  kb_id uuid not null references public.knowledge_base(id) on delete cascade,
  content text not null,
  embedding vector(384),
  created_at timestamptz not null default now()
);

-- HNSW index for fast cosine similarity search
create index if not exists document_chunks_embedding_idx
  on public.document_chunks
  using hnsw (embedding vector_cosine_ops);

-- leads_campaign: rows fetched by n8n from Apollo
create table if not exists public.leads_campaign (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  first_name varchar,
  last_name varchar,
  email varchar,
  company_name varchar,
  job_title varchar,
  industry varchar,
  generated_subject text,
  generated_email text,
  status varchar not null default 'pending',
  created_at timestamptz not null default now()
);

-- Cosine similarity search RPC used by the LangChain/outreach worker.
create or replace function public.match_document_chunks(
  query_embedding vector(384),
  match_count int default 2,
  p_user_id uuid default null
)
returns table (
  id uuid,
  kb_id uuid,
  content text,
  similarity float
)
language sql stable
as $$
  select
    dc.id,
    dc.kb_id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) as similarity
  from public.document_chunks dc
  join public.knowledge_base kb on kb.id = dc.kb_id
  where (p_user_id is null or kb.user_id = p_user_id)
  order by dc.embedding <=> query_embedding
  limit match_count;
$$;
