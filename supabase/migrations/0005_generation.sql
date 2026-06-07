-- ============================================================
-- Migration 0005: generation model (Step 6)
--
-- - ai_provider_keys gains a `category` column so analysis LLM keys ('llm')
--   are kept separate from image/video generation keys ('image' / 'video').
--   Existing rows default to 'llm', preserving Step 4/5 behavior.
-- - generations: stored generation runs (output type, provider, brief, result).
--
-- The external trend API config (spec 5-3) is stored in existing tables:
-- endpoint/parsing rule in system_settings (key 'trend_api'), and the trend API
-- key encrypted in app_secrets (name 'trend_api_key').
-- ============================================================

alter table public.ai_provider_keys
  add column if not exists category text not null default 'llm';

create index if not exists ai_provider_keys_category_idx
  on public.ai_provider_keys (category);

create table if not exists public.generations (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users (id) on delete set null,
  output_type text not null,
  provider text,
  brief text,
  result jsonb,
  created_at timestamptz not null default now()
);

create index if not exists generations_created_by_idx
  on public.generations (created_by);

alter table public.generations enable row level security;

drop policy if exists "generations_select_own" on public.generations;
create policy "generations_select_own"
  on public.generations for select
  to authenticated
  using (auth.uid() = created_by);
