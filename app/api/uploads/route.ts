import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole, jsonError, AuthError } from "@/lib/auth/api";
import { ROLES } from "@/lib/constants";
import { createUploadTarget } from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * POST - issue a signed upload target so the client can upload media directly to
 * Cloud Storage, bypassing the serverless payload limit (spec 1-5). Body:
 * { filename }. Returns { provider, bucket, path, token }.
 */
export async function POST(request: NextRequest) {
  try {
    const caller = await requireApiRole(ROLES.USER);
    const body = (await request.json()) as { filename?: string };
    const filename = (body.filename ?? "").trim();
    if (!filename) throw new AuthError(400, "파일 이름은 필수입니다.");

    const target = await createUploadTarget(caller.id, filename);
    return NextResponse.json(target);
  } catch (error) {
    return jsonError(error);
  }
}
