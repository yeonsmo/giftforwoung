import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole, jsonError, AuthError } from "@/lib/auth/api";
import { ROLES } from "@/lib/constants";
import { assertInstagramActive } from "@/lib/instagram/config";
import { schedulePost } from "@/lib/instagram/scheduler";
import type { InstagramMediaType } from "@/lib/instagram/client";

export const dynamic = "force-dynamic";

/**
 * POST - schedule an Instagram post (spec 8-1-1). Frozen until activated. Body:
 * { mediaUrl, mediaType?, caption?, scheduledAt? }. Omit scheduledAt to have the
 * AI agent choose an optimal time.
 */
export async function POST(request: NextRequest) {
  try {
    const caller = await requireApiRole(ROLES.ADMIN);
    await assertInstagramActive();

    const body = (await request.json()) as {
      mediaUrl?: string;
      mediaType?: InstagramMediaType;
      caption?: string;
      scheduledAt?: string;
    };
    if (!body.mediaUrl) throw new AuthError(400, "mediaUrl은 필수입니다.");

    const result = await schedulePost({
      mediaUrl: body.mediaUrl,
      mediaType: body.mediaType ?? "IMAGE",
      caption: body.caption,
      scheduledAt: body.scheduledAt,
      createdBy: caller.id,
    });
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
