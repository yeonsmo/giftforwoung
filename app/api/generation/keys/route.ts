import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole, jsonError, AuthError } from "@/lib/auth/api";
import {
  ROLES,
  KEY_CATEGORIES,
  IMAGE_PROVIDERS,
  VIDEO_PROVIDERS,
} from "@/lib/constants";
import { listKeyMeta, addKey } from "@/lib/ai/keys-store";

export const dynamic = "force-dynamic";

const IMAGE_IDS = IMAGE_PROVIDERS.map((p) => p.id) as string[];
const VIDEO_IDS = VIDEO_PROVIDERS.map((p) => p.id) as string[];

/** GET - list image and video generation key metadata (Admin+). */
export async function GET() {
  try {
    await requireApiRole(ROLES.ADMIN);
    const [image, video] = await Promise.all([
      listKeyMeta(KEY_CATEGORIES.IMAGE),
      listKeyMeta(KEY_CATEGORIES.VIDEO),
    ]);
    return NextResponse.json({ image, video });
  } catch (error) {
    return jsonError(error);
  }
}

/** POST - add an image or video generation key (Admin+). Body: { provider, label?, key }. */
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
    if (!key) throw new AuthError(400, "API 키 값은 필수입니다.");

    let category: string;
    if (IMAGE_IDS.includes(provider)) category = KEY_CATEGORIES.IMAGE;
    else if (VIDEO_IDS.includes(provider)) category = KEY_CATEGORIES.VIDEO;
    else throw new AuthError(400, "지원하지 않는 생성 제공자입니다.");

    await addKey({
      provider,
      label: body.label?.trim() || null,
      key,
      createdBy: caller.id,
      category,
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
