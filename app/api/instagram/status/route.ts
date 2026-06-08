import { NextResponse } from "next/server";
import { requireApiRole, jsonError } from "@/lib/auth/api";
import { ROLES } from "@/lib/constants";
import { getInstagramStatus } from "@/lib/instagram/config";

export const dynamic = "force-dynamic";

/** GET - frozen-feature activation status (spec 8-2). Any authenticated user. */
export async function GET() {
  try {
    await requireApiRole(ROLES.USER);
    const status = await getInstagramStatus();
    return NextResponse.json(status);
  } catch (error) {
    return jsonError(error);
  }
}
