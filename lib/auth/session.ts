import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { roleAtLeast } from "@/lib/auth/roles";
import type { Role } from "@/lib/constants";
import type { ProfileRow } from "@/types/database";

export interface SessionUser {
  id: string;
  email: string;
  role: Role;
  isActive: boolean;
}

/**
 * Returns the current authenticated user with profile/role, or null. Safe to
 * call from any server component; returns null (treated as logged out) if the
 * auth backend is unreachable so public pages still render.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("profiles")
      .select("id,email,role,is_active,created_at,updated_at")
      .eq("id", user.id)
      .single();

    if (error || !data) return null;
    const profile = data as ProfileRow;
    return {
      id: profile.id,
      email: profile.email,
      role: profile.role,
      isActive: profile.is_active,
    };
  } catch {
    return null;
  }
}

/** Redirects to /login if not authenticated or inactive. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!user.isActive) redirect("/login?error=inactive");
  return user;
}

/** Redirects unauthorized users; use in protected layouts/pages. */
export async function requireRole(min: Role): Promise<SessionUser> {
  const user = await requireUser();
  if (!roleAtLeast(user.role, min)) redirect("/dashboard");
  return user;
}
