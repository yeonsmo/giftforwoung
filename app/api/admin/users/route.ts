import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole, jsonError, AuthError } from "@/lib/auth/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAssignableRole } from "@/lib/auth/roles";
import { ROLES } from "@/lib/constants";
import type { ProfileRow } from "@/types/database";

export const dynamic = "force-dynamic";

/** GET /api/admin/users - list accounts (Admin or above). */
export async function GET() {
  try {
    await requireApiRole(ROLES.ADMIN);
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("profiles")
      .select("id,email,role,is_active,created_at,updated_at")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return NextResponse.json({ users: (data ?? []) as ProfileRow[] });
  } catch (error) {
    return jsonError(error);
  }
}

/**
 * POST /api/admin/users - create an account (Admin or above).
 * Body: { email, password, role }. Role must be user or admin; Super Admin
 * cannot be created here (spec 2-3) - it exists only as the env-driven seed.
 */
export async function POST(request: NextRequest) {
  try {
    await requireApiRole(ROLES.ADMIN);
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      role?: string;
    };

    const email = (body.email ?? "").trim();
    const password = body.password ?? "";
    const role = body.role ?? ROLES.USER;

    if (!email || !password) {
      throw new AuthError(400, "이메일과 비밀번호는 필수입니다.");
    }
    if (!isAssignableRole(role)) {
      throw new AuthError(400, "지정할 수 없는 권한 등급입니다. (user 또는 admin만 가능)");
    }

    const admin = createAdminClient();
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createError) throw new Error(createError.message);

    const userId = created.user?.id;
    if (!userId) throw new Error("사용자 생성 후 ID를 가져오지 못했습니다.");

    const { error: roleError } = await admin
      .from("profiles")
      .update({ role, updated_at: new Date().toISOString() })
      .eq("id", userId);
    if (roleError) throw new Error(roleError.message);

    return NextResponse.json({ id: userId, email, role }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
