import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole, jsonError, AuthError } from "@/lib/auth/api";
import { ROLES } from "@/lib/constants";
import { listApiKeys, issueApiKey } from "@/lib/webhooks/keys";

export const dynamic = "force-dynamic";

/** GET - list issued API keys (metadata only). Admin+. */
export async function GET() {
  try {
    await requireApiRole(ROLES.ADMIN);
    const keys = await listApiKeys();
    return NextResponse.json({ keys });
  } catch (error) {
    return jsonError(error);
  }
}

/**
 * POST - issue a new API key (spec 7-3). Body: { name?, webhookUrl? }.
 * The raw token is returned ONCE; only its hash is stored.
 */
export async function POST(request: NextRequest) {
  try {
    const caller = await requireApiRole(ROLES.ADMIN);
    const body = (await request.json()) as { name?: string; webhookUrl?: string };
    const webhookUrl = body.webhookUrl?.trim() || null;
    if (webhookUrl) {
      try {
        new URL(webhookUrl);
      } catch {
        throw new AuthError(400, "웹훅 URL 형식이 올바르지 않습니다.");
      }
    }
    const { id, token } = await issueApiKey({
      name: body.name?.trim() || null,
      webhookUrl,
      createdBy: caller.id,
    });
    // token is returned only here and never again.
    return NextResponse.json({ id, token }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
