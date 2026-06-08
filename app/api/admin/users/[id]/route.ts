import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole, jsonError, AuthError } from "@/lib/auth/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAssignableRole, isSuperAdmin } from "@/lib/auth/roles";
import { ROLES } from "@/lib/constants";
import type { ProfileRow } from "@/types/database";

export const dynamic = "force-dynamic";

/**
 * Loads the target profile and enforces the Super Admin protection rules
 * (spec 2-5). A Super Admin target cannot be modified by anyone through this
 * admin API: no delete, no role change, no forced password change, regardless
 * of the caller. This is the server-side enforcement; UI hiding is not relied on.
 */
async function loadTargetOrThrow(admin: ReturnType<typeof createAdminClient>, id: string) {
  const { data, error } = await admin
    .from("profiles")
    .select("id,email,role,is_active,created_at,updated_at")
    .eq("id", id)
    .single();
  if (error || !data) throw new AuthError(404, "대상 계정을 찾을 수 없습니다.");
  return data as ProfileRow;
}

/**
 * PATCH /api/admin/users/[id] - update role, active status, or password.
 * Body: { role?, is_active?, password? }.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireApiRole(ROLES.ADMIN);
    const { id } = await params;
    const body = (await request.json()) as {
      role?: string;
      is_active?: boolean;
      password?: string;
    };

    const admin = createAdminClient();
    const target = await loadTargetOrThrow(admin, id);

    // Super Admin protection: block role change, password change, and
    // deactivation of a Super Admin (spec 2-5 rules 2 and 3).
    if (isSuperAdmin(target.role)) {
      throw new AuthError(403, "최고권한자 계정은 변경할 수 없습니다.");
    }

    // No account may be elevated to Super Admin through the API (spec 2-3).
    if (body.role !== undefined && !isAssignableRole(body.role)) {
      throw new AuthError(400, "지정할 수 없는 권한 등급입니다. (user 또는 admin만 가능)");
    }

    if (body.password !== undefined) {
      const { error } = await admin.auth.admin.updateUserById(id, {
        password: body.password,
      });
      if (error) throw new Error(error.message);
    }

    const profileUpdate: Partial<Pick<ProfileRow, "role" | "is_active">> & {
      updated_at: string;
    } = { updated_at: new Date().toISOString() };
    if (body.role !== undefined) profileUpdate.role = body.role as ProfileRow["role"];
    if (body.is_active !== undefined) profileUpdate.is_active = body.is_active;

    const { error: updateError } = await admin
      .from("profiles")
      .update(profileUpdate)
      .eq("id", id);
    if (updateError) throw new Error(updateError.message);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}

/** DELETE /api/admin/users/[id] - delete an account. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const caller = await requireApiRole(ROLES.ADMIN);
    const { id } = await params;

    const admin = createAdminClient();
    const target = await loadTargetOrThrow(admin, id);

    // Super Admin protection: block deletion of a Super Admin (spec 2-5 rule 1).
    if (isSuperAdmin(target.role)) {
      throw new AuthError(403, "최고권한자 계정은 삭제할 수 없습니다.");
    }
    if (caller.id === id) {
      throw new AuthError(400, "본인 계정은 삭제할 수 없습니다.");
    }

    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) throw new Error(error.message);
    // profiles row is removed by the on delete cascade FK.

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
