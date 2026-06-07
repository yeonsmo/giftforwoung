import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole, jsonError, AuthError } from "@/lib/auth/api";
import { ROLES } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  reverifyGeneration,
  type StoredGenerationResult,
} from "@/lib/workflow/reverify";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * POST - re-verify a generated content item through the analysis engine
 * (spec 6-3/6-4). Body: { generationId }. Loads the caller's generation (RLS),
 * runs the analysis (single model or debate), stores the result, and returns it.
 */
export async function POST(request: NextRequest) {
  try {
    const caller = await requireApiRole(ROLES.USER);
    const body = (await request.json()) as { generationId?: string };
    const generationId = (body.generationId ?? "").trim();
    if (!generationId) throw new AuthError(400, "generationId는 필수입니다.");

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("generations")
      .select("id,output_type,result")
      .eq("id", generationId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new AuthError(404, "생성 기록을 찾을 수 없습니다.");

    const stored = (data.result ?? {}) as StoredGenerationResult;
    const result = await reverifyGeneration({
      outputType: data.output_type as string,
      text: stored.text,
      imageDataUrl: stored.imageDataUrl,
    });

    // Record the re-verification as an analysis run sourced from generation.
    const admin = createAdminClient();
    const { error: insertError } = await admin.from("analyses").insert({
      created_by: caller.id,
      source: "generation",
      media_kind: data.output_type,
      mode: result.mode,
      result: result.verdict,
    });
    if (insertError) throw new Error(insertError.message);

    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
