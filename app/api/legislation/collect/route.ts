import { NextResponse } from "next/server";
import { requireApiRole, jsonError } from "@/lib/auth/api";
import { ROLES } from "@/lib/constants";
import { collectAllLegislation } from "@/lib/legislation/collect";

export const dynamic = "force-dynamic";
// Collection performs many external requests; allow more time where supported.
export const maxDuration = 300;

/**
 * POST - run a legislation collection across the seven categories using the
 * configured 법제처 key, then update the counter (spec 3-3-4). Requires Admin+.
 * Errors are surfaced raw (spec 9-4).
 */
export async function POST() {
  try {
    await requireApiRole(ROLES.ADMIN);
    const result = await collectAllLegislation();
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
