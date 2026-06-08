-- ============================================================
-- Migration 0002: system settings (Step 2)
--
-- Generic key/value system settings store. Settings entered by the Super Admin
-- are locked (super_admin_locked = true) so that Admins cannot alter them
-- (spec 2-5 rule 4). All writes go through the service-role client where the
-- application enforces the protection rules; RLS only grants read access.
-- ============================================================

create table if not exists public.system_settings (
  key text primary key,
  value jsonb,
  super_admin_locked boolean not null default false,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

-- Helpful index for listing users by role (admin console).
create index if not exists profiles_role_idx on public.profiles (role);

-- Row Level Security: authenticated users may read settings; writes are
-- performed only by the service-role client (which bypasses RLS) so that the
-- Super Admin protection logic in application code is the single enforcement
-- point.
alter table public.system_settings enable row level security;

drop policy if exists "system_settings_select_authenticated" on public.system_settings;
create policy "system_settings_select_authenticated"
  on public.system_settings for select
  to authenticated
  using (true);
