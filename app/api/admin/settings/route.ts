import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole, jsonError, AuthError } from "@/lib/auth/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSuperAdmin } from "@/lib/auth/roles";
import { ROLES } from "@/lib/constants";
import type { SystemSettingRow } from "@/types/database";

export const dynamic = "force-dynamic";

/** GET /api/admin/settings - list system settings (Admin or above). */
export async function GET() {
  try {
    await requireApiRole(ROLES.ADMIN);
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("system_settings")
      .select("key,value,super_admin_locked,updated_by,updated_at")
      .order("key", { ascending: true });
    if (error) throw new Error(error.message);
    return NextResponse.json({ settings: (data ?? []) as SystemSettingRow[] });
  } catch (error) {
    return jsonError(error);
  }
}

/**
 * PUT /api/admin/settings - upsert a system setting. Body: { key, value }.
 *
 * Super Admin protection (spec 2-5 rule 4): a setting that the Super Admin
 * entered is locked (super_admin_locked = true) and cannot be changed by an
 * Admin. Only the Super Admin may modify a locked setting. Settings written by
 * the Super Admin are marked locked so they stay protected thereafter.
 */
export async function PUT(request: NextRequest) {
  try {
    const caller = await requireApiRole(ROLES.ADMIN);
    const body = (await request.json()) as { key?: string; value?: unknown };
    const key = (body.key ?? "").trim();
    if (!key) throw new AuthError(400, "설정 키는 필수입니다.");

    const admin = createAdminClient();
    const callerIsSuper = isSuperAdmin(caller.role);

    const { data: existing } = await admin
      .from("system_settings")
      .select("key,super_admin_locked")
      .eq("key", key)
      .maybeSingle();

    const existingRow = existing as Pick<
      SystemSettingRow,
      "key" | "super_admin_locked"
    > | null;

    if (existingRow?.super_admin_locked && !callerIsSuper) {
      throw new AuthError(
        403,
        "최고권한자가 설정한 항목입니다. 관리자는 변경할 수 없습니다.",
      );
    }

    const { error } = await admin.from("system_settings").upsert(
      {
        key,
        value: body.value ?? null,
        // Settings entered by the Super Admin become locked; an Admin writing a
        // new/unlocked setting keeps it unlocked.
        super_admin_locked: callerIsSuper ? true : (existingRow?.super_admin_locked ?? false),
        updated_by: caller.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
