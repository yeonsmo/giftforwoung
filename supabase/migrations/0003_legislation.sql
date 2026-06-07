-- ============================================================
-- Migration 0003: legislation collection (Step 3)
--
-- Three concerns, deliberately separated so the 법제처 API key management and
-- the 91-day update counter stay independent (spec 3-1-3):
--   1. legislation        - collected legislation documents (the analysis data).
--   2. legislation_meta    - single-row collection counter (first/last dates).
--   3. app_secrets         - encrypted secrets (the 법제처 API key, AES-256-GCM).
--
-- Deleting the API key (app_secrets) never touches legislation_meta, and the
-- counter logic never reads the key. Analysis works on existing legislation
-- rows even when the key has been removed (spec 3-4-4).
-- ============================================================

-- 1. Collected legislation documents.
create table if not exists public.legislation (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  law_name text not null,
  law_id text,
  article_no text,
  content text,
  source_url text,
  raw jsonb,
  fetched_at timestamptz not null default now()
);

create index if not exists legislation_category_idx on public.legislation (category);
create index if not exists legislation_law_id_idx on public.legislation (law_id);

alter table public.legislation enable row level security;

-- Authenticated users may read legislation (needed by the analysis engine).
drop policy if exists "legislation_select_authenticated" on public.legislation;
create policy "legislation_select_authenticated"
  on public.legislation for select
  to authenticated
  using (true);
-- Writes are performed only by the service-role client during collection.

-- 2. Collection counter (single row, fixed id = 1). Independent of the key.
create table if not exists public.legislation_meta (
  id smallint primary key default 1,
  first_collected_at timestamptz,
  last_collected_at timestamptz,
  total_count integer not null default 0,
  constraint legislation_meta_singleton check (id = 1)
);

insert into public.legislation_meta (id)
values (1)
on conflict (id) do nothing;

alter table public.legislation_meta enable row level security;

drop policy if exists "legislation_meta_select_authenticated" on public.legislation_meta;
create policy "legislation_meta_select_authenticated"
  on public.legislation_meta for select
  to authenticated
  using (true);

-- 3. Encrypted secrets store (法제처 API key, and reusable for other secrets).
-- RLS is enabled with NO policies, so only the service-role client can access
-- it. Ciphertext is never exposed to the browser.
create table if not exists public.app_secrets (
  name text primary key,
  ciphertext text not null,
  iv text not null,
  auth_tag text not null,
  super_admin_locked boolean not null default false,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.app_secrets enable row level security;
