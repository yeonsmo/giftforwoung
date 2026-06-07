-- ============================================================
-- Migration 0004: AI provider keys and analyses (Step 4)
--
-- - ai_provider_keys: multiple encrypted AI API keys (spec 4-1). Like
--   app_secrets, RLS is enabled with NO policies so only the service-role
--   client can read/write; key material is never exposed to the browser.
-- - analyses: stored analysis runs and their verdicts (spec 4-2 / 9-3).
-- ============================================================

create table if not exists public.ai_provider_keys (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  label text,
  ciphertext text not null,
  iv text not null,
  auth_tag text not null,
  is_active boolean not null default true,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists ai_provider_keys_provider_idx
  on public.ai_provider_keys (provider);

alter table public.ai_provider_keys enable row level security;
-- No policies: service-role only.

create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users (id) on delete set null,
  source text not null default 'upload',
  media_path text,
  media_kind text,
  mime_type text,
  mode text,
  result jsonb,
  created_at timestamptz not null default now()
);

create index if not exists analyses_created_by_idx on public.analyses (created_by);

alter table public.analyses enable row level security;

-- Users may read their own analyses; writes go through the service-role client.
drop policy if exists "analyses_select_own" on public.analyses;
create policy "analyses_select_own"
  on public.analyses for select
  to authenticated
  using (auth.uid() = created_by);
