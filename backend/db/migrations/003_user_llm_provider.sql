-- Per-user LLM provider preference (gemini | groq)
alter table public.app_users
  add column if not exists llm_provider varchar not null default 'gemini';
