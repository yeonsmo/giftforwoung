import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole, jsonError } from "@/lib/auth/api";
import { ROLES } from "@/lib/constants";
import { setInstagramToggle, getInstagramStatus } from "@/lib/instagram/config";

export const dynamic = "force-dynamic";

/**
 * PUT - set the in-app activation toggle (spec 8-1-3). Admin+. The feature still
 * only activates if env credentials and the FEATURE_INSTAGRAM_ENABLED flag are
 * also present.
 */
export async function PUT(request: NextRequest) {
  try {
    const caller = await requireApiRole(ROLES.ADMIN);
    const body = (await request.json()) as { enabled?: boolean };
    await setInstagramToggle(Boolean(body.enabled), caller);
    const status = await getInstagramStatus();
    return NextResponse.json(status);
  } catch (error) {
    return jsonError(error);
  }
}
