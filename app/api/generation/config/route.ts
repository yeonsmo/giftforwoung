import { NextResponse } from "next/server";
import { requireApiRole, jsonError } from "@/lib/auth/api";
import { ROLES } from "@/lib/constants";
import { getGenerationConfig } from "@/lib/generation/config";

export const dynamic = "force-dynamic";

/** GET - generation availability and trend config (spec 5-2-4). User+. */
export async function GET() {
  try {
    await requireApiRole(ROLES.USER);
    const config = await getGenerationConfig();
    return NextResponse.json(config);
  } catch (error) {
    return jsonError(error);
  }
}
