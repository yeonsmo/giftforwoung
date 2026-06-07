import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole, jsonError, AuthError } from "@/lib/auth/api";
import { ROLES, AI_PROVIDERS } from "@/lib/constants";
import { listKeyMeta, addKey } from "@/lib/ai/keys-store";

export const dynamic = "force-dynamic";

const VALID_PROVIDERS = AI_PROVIDERS.map((p) => p.id) as string[];

/** GET - list AI key metadata (no secret values). Admin+. */
export async function GET() {
  try {
    await requireApiRole(ROLES.ADMIN);
    const keys = await listKeyMeta();
    return NextResponse.json({ keys });
  } catch (error) {
    return jsonError(error);
  }
}

/** POST - add an AI key. Body: { provider, label?, key }. Admin+. */
export async function POST(request: NextRequest) {
  try {
    const caller = await requireApiRole(ROLES.ADMIN);
    const body = (await request.json()) as {
      provider?: string;
      label?: string;
      key?: string;
    };
    const provider = (body.provider ?? "").trim();
    const key = (body.key ?? "").trim();
    if (!VALID_PROVIDERS.includes(provider)) {
      throw new AuthError(400, "지원하지 않는 제공자입니다.");
    }
    if (!key) throw new AuthError(400, "AI API 키 값은 필수입니다.");

    await addKey({
      provider,
      label: body.label?.trim() || null,
      key,
      createdBy: caller.id,
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
