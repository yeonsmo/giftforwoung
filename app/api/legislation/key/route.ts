import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole, jsonError, AuthError } from "@/lib/auth/api";
import { isSuperAdmin } from "@/lib/auth/roles";
import { ROLES } from "@/lib/constants";
import {
  getSecretMeta,
  setSecret,
  deleteSecret,
  MOLEG_KEY_NAME,
} from "@/lib/legislation/secrets-store";

export const dynamic = "force-dynamic";

/**
 * 법제처 API key management (spec 3-1). This module never touches the 91-day
 * counter (legislation_meta) - key and counter are independent (spec 3-1-3).
 * The key value is never returned to the client; only presence/lock metadata is.
 */

/** GET - key presence and lock status (no value). */
export async function GET() {
  try {
    await requireApiRole(ROLES.ADMIN);
    const meta = await getSecretMeta(MOLEG_KEY_NAME);
    return NextResponse.json(meta);
  } catch (error) {
    return jsonError(error);
  }
}

/** PUT - set or replace the key. Body: { key }. */
export async function PUT(request: NextRequest) {
  try {
    const caller = await requireApiRole(ROLES.ADMIN);
    const callerIsSuper = isSuperAdmin(caller.role);

    const existing = await getSecretMeta(MOLEG_KEY_NAME);
    // Super Admin protection (spec 2-5 rule 4): a key set by the Super Admin
    // cannot be changed by an Admin.
    if (existing.superAdminLocked && !callerIsSuper) {
      throw new AuthError(
        403,
        "최고권한자가 설정한 법제처 API 키입니다. 관리자는 변경할 수 없습니다.",
      );
    }

    const body = (await request.json()) as { key?: string };
    const key = (body.key ?? "").trim();
    if (!key) throw new AuthError(400, "법제처 API 키 값은 필수입니다.");

    await setSecret(MOLEG_KEY_NAME, key, {
      lockedBySuperAdmin: callerIsSuper,
      updatedBy: caller.id,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}

/** DELETE - remove the key (spec 3-4-2). Does not affect the counter. */
export async function DELETE() {
  try {
    const caller = await requireApiRole(ROLES.ADMIN);
    const existing = await getSecretMeta(MOLEG_KEY_NAME);
    if (existing.superAdminLocked && !isSuperAdmin(caller.role)) {
      throw new AuthError(
        403,
        "최고권한자가 설정한 법제처 API 키입니다. 관리자는 삭제할 수 없습니다.",
      );
    }
    await deleteSecret(MOLEG_KEY_NAME);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
