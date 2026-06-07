import { NextResponse, type NextRequest } from "next/server";
import { jsonError, AuthError } from "@/lib/auth/api";
import { verifyApiKey, extractToken } from "@/lib/webhooks/keys";
import { sendWebhook } from "@/lib/webhooks/sign";
import { runAnalysis } from "@/lib/ai/analysis";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * External analysis endpoint (spec 7-2). Authenticated by an issued API key, not
 * a user session, so external systems can call the analysis function. Supply the
 * token via "Authorization: Bearer <token>" or "x-api-key: <token>".
 *
 * Body: { mediaUrl, mimeType } to analyze an image/video at a URL, or
 * { contentText } to analyze text. If the key has a webhook URL, the signed
 * result is also delivered there.
 */
export async function POST(request: NextRequest) {
  try {
    const token = extractToken(request);
    if (!token) throw new AuthError(401, "API 키가 필요합니다.");
    const key = await verifyApiKey(token);
    if (!key) throw new AuthError(401, "유효하지 않거나 폐기된 API 키입니다.");

    const body = (await request.json()) as {
      mediaUrl?: string;
      mimeType?: string;
      contentText?: string;
      note?: string;
    };

    let media;
    if (body.mediaUrl && body.mimeType) {
      const res = await fetch(body.mediaUrl);
      if (!res.ok) {
        throw new Error(`미디어 다운로드 실패 (HTTP ${res.status})`);
      }
      const bytes = Buffer.from(await res.arrayBuffer());
      media = { base64: bytes.toString("base64"), mimeType: body.mimeType };
    }

    if (!media && !body.contentText) {
      throw new AuthError(400, "mediaUrl+mimeType 또는 contentText가 필요합니다.");
    }

    const result = await runAnalysis({
      media,
      contentText: body.contentText,
      note: body.note,
    });

    // Record the run, attributed to the key's creator, sourced as external.
    const admin = createAdminClient();
    await admin.from("analyses").insert({
      created_by: key.createdBy,
      source: "external",
      media_kind: media ? "media" : "text",
      mode: result.mode,
      result: result.verdict,
    });

    // Deliver to the key's webhook if configured.
    let webhook;
    if (key.webhookUrl) {
      webhook = await sendWebhook(key.webhookUrl, { type: "analysis.result", result });
    }

    return NextResponse.json({ result, webhook });
  } catch (error) {
    return jsonError(error);
  }
}
