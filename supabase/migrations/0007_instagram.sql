-- ============================================================
-- Migration 0007: Instagram auto-upload (Step 9 - FROZEN feature)
--
-- The Instagram (Meta) Graph API integration is implemented in full but stays
-- inactive until credentials are provided in env, the FEATURE_INSTAGRAM_ENABLED
-- flag is true, and the in-app toggle is enabled. This table backs the
-- scheduler; it is created so the frozen feature is complete and ready.
--
-- Note: Instagram Graph API publishing requires a Business or Creator account,
-- a linked Facebook Page, and Meta app review.
-- ============================================================

create table if not exists public.instagram_scheduled_posts (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users (id) on delete set null,
  media_url text not null,
  media_type text not null default 'IMAGE',
  caption text,
  scheduled_at timestamptz not null,
  status text not null default 'scheduled',
  container_id text,
  published_id text,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists instagram_scheduled_posts_status_idx
  on public.instagram_scheduled_posts (status, scheduled_at);

alter table public.instagram_scheduled_posts enable row level security;

drop policy if exists "instagram_scheduled_select_own" on public.instagram_scheduled_posts;
create policy "instagram_scheduled_select_own"
  on public.instagram_scheduled_posts for select
  to authenticated
  using (auth.uid() = created_by);
