import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole, jsonError, AuthError } from "@/lib/auth/api";
import { ROLES } from "@/lib/constants";
import { assertInstagramActive } from "@/lib/instagram/config";
import { publishNow, type InstagramMediaType } from "@/lib/instagram/client";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * POST - publish immediately to Instagram (spec 8-1). Frozen: returns the
 * not-implemented error from assertInstagramActive until the feature is fully
 * activated. Body: { mediaUrl, mediaType, caption? }.
 */
export async function POST(request: NextRequest) {
  try {
    await requireApiRole(ROLES.ADMIN);
    await assertInstagramActive();

    const body = (await request.json()) as {
      mediaUrl?: string;
      mediaType?: InstagramMediaType;
      caption?: string;
    };
    if (!body.mediaUrl) throw new AuthError(400, "mediaUrl은 필수입니다.");

    const result = await publishNow({
      mediaUrl: body.mediaUrl,
      mediaType: body.mediaType ?? "IMAGE",
      caption: body.caption,
    });
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
