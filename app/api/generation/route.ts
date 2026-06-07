import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole, jsonError, AuthError } from "@/lib/auth/api";
import { ROLES } from "@/lib/constants";
import { downloadBytes } from "@/lib/storage";
import { runGeneration } from "@/lib/generation";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * POST - generate content (spec 5). Body:
 * { outputType, provider?, brief, bucket?, path?, mimeType?, note? }.
 * Optional uploaded reference media is fetched from storage. The result is
 * stored and returned for download and later re-verification (Step 7).
 */
export async function POST(request: NextRequest) {
  try {
    const caller = await requireApiRole(ROLES.USER);
    const body = (await request.json()) as {
      outputType?: string;
      provider?: string;
      brief?: string;
      bucket?: string;
      path?: string;
      mimeType?: string;
      note?: string;
    };
    const outputType = (body.outputType ?? "").trim();
    const brief = (body.brief ?? "").trim();
    if (!outputType) throw new AuthError(400, "출력 유형은 필수입니다.");
    if (!brief) throw new AuthError(400, "생성 브리프는 필수입니다.");

    let media;
    if (body.bucket && body.path && body.mimeType) {
      const bytes = await downloadBytes(body.bucket, body.path);
      media = { base64: bytes.toString("base64"), mimeType: body.mimeType };
    }

    const result = await runGeneration({
      outputType,
      provider: body.provider,
      brief,
      media,
      note: body.note,
    });

    const admin = createAdminClient();
    const { error } = await admin.from("generations").insert({
      created_by: caller.id,
      output_type: outputType,
      provider: body.provider ?? result.provider ?? null,
      brief,
      result,
    });
    if (error) throw new Error(error.message);

    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
