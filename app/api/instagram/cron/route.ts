import { NextResponse } from "next/server";
import { requireApiRole, jsonError } from "@/lib/auth/api";
import { ROLES } from "@/lib/constants";
import { assertInstagramActive } from "@/lib/instagram/config";
import { processDuePosts } from "@/lib/instagram/scheduler";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * POST - process scheduled posts that are due (spec 8-1-1). Frozen until
 * activated. Intended to be invoked by a scheduled cron trigger once the feature
 * is live (e.g. a Vercel Cron). Admin+ for manual invocation.
 */
export async function POST() {
  try {
    await requireApiRole(ROLES.ADMIN);
    await assertInstagramActive();
    const result = await processDuePosts();
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
