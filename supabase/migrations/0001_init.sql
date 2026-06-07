-- ============================================================
-- Migration 0001: foundation (profiles + role tiers)
--
-- Establishes the cross-cutting auth/role primitives every later step depends
-- on. Feature tables (legislation, ai_provider_keys, analyses, generations,
-- api_keys, instagram_accounts, ...) are added in their own step's migration.
--
-- Apply with the Supabase CLI (supabase db push) or paste into the SQL editor
-- once Supabase credentials exist. Authored in Step 1; not required to run yet.
-- ============================================================

-- Role tiers (spec 2-1).
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('user', 'admin', 'super_admin');
  end if;
end$$;

-- Profile per auth user. Backbone for role gating (Step 2).
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  role public.app_role not null default 'user',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create a profile row when a new auth user is inserted.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row Level Security.
alter table public.profiles enable row level security;

-- Users can read their own profile.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

-- Users can update their own non-privileged fields. Role changes and
-- super-admin protection are enforced server-side via the service-role client
-- in Step 2 (admins never receive direct table write access through RLS).
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Note: the service-role client bypasses RLS and is the only path for
-- administrative writes (account creation, role changes, deactivation), where
-- the Super Admin protection rules (spec 2-5) are enforced in application code.
