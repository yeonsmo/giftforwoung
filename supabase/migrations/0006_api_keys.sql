-- ============================================================
-- Migration 0006: external API key issuance + webhooks (Step 8)
--
-- The application issues its own API keys so external systems can call the
-- analysis function (spec 7). Only a SHA-256 hash of each token is stored (the
-- raw token is shown once at issuance); a short prefix is kept for display.
-- Each key may carry an optional outbound webhook URL for result delivery.
-- RLS is enabled with NO policies, so only the service-role client accesses it.
-- ============================================================

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  name text,
  key_hash text not null unique,
  key_prefix text not null,
  webhook_url text,
  is_active boolean not null default true,
  created_by uuid references auth.users (id) on delete set null,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists api_keys_key_hash_idx on public.api_keys (key_hash);

alter table public.api_keys enable row level security;
-- No policies: service-role only.
