import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole, jsonError, AuthError } from "@/lib/auth/api";
import { ROLES } from "@/lib/constants";
import { downloadBytes } from "@/lib/storage";
import { runSingleModelAnalysis } from "@/lib/ai/analysis";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * POST - run an analysis on uploaded media (spec 4-2). Body:
 * { bucket, path, mimeType, mediaKind, note? }. Fetches the media from storage,
 * runs the single-model engine, stores the result, and returns the verdict.
 * Step 5 extends this to multi-model debate when 2+ keys are present.
 */
export async function POST(request: NextRequest) {
  try {
    const caller = await requireApiRole(ROLES.USER);
    const body = (await request.json()) as {
      bucket?: string;
      path?: string;
      mimeType?: string;
      mediaKind?: string;
      note?: string;
    };
    const bucket = (body.bucket ?? "").trim();
    const path = (body.path ?? "").trim();
    const mimeType = (body.mimeType ?? "").trim();
    if (!bucket || !path || !mimeType) {
      throw new AuthError(400, "bucket, path, mimeType는 필수입니다.");
    }

    const bytes = await downloadBytes(bucket, path);
    const result = await runSingleModelAnalysis({
      media: { base64: bytes.toString("base64"), mimeType },
      note: body.note,
    });

    // Persist the analysis run (service role).
    const admin = createAdminClient();
    const { error } = await admin.from("analyses").insert({
      created_by: caller.id,
      source: "upload",
      media_path: path,
      media_kind: body.mediaKind ?? null,
      mime_type: mimeType,
      mode: result.mode,
      result: result.verdict,
    });
    if (error) throw new Error(error.message);

    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
