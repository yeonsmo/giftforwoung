import type { Role } from "@/lib/constants";

/**
 * Hand-written row types for the tables defined in supabase/migrations.
 * Replace with generated types (supabase gen types typescript) once the
 * Supabase project exists.
 */

export interface ProfileRow {
  id: string;
  email: string;
  role: Role;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SystemSettingRow {
  key: string;
  value: unknown;
  super_admin_locked: boolean;
  updated_by: string | null;
  updated_at: string;
}
