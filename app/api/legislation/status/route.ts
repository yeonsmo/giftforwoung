import { NextResponse } from "next/server";
import { requireApiRole, jsonError } from "@/lib/auth/api";
import { ROLES } from "@/lib/constants";
import { getLegislationStatus } from "@/lib/legislation/meta";

export const dynamic = "force-dynamic";

/**
 * GET - 91-day counter status (spec 3-3). Independent of the 법제처 API key.
 * Available to any authenticated user so the update popup can be shown.
 */
export async function GET() {
  try {
    await requireApiRole(ROLES.USER);
    const status = await getLegislationStatus();
    return NextResponse.json(status);
  } catch (error) {
    return jsonError(error);
  }
}
