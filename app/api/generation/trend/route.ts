import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole, jsonError } from "@/lib/auth/api";
import { ROLES } from "@/lib/constants";
import { setTrendConfig } from "@/lib/generation/trend-config";

export const dynamic = "force-dynamic";

/**
 * PUT - set the external trend API config (spec 5-3-2). Admin+.
 * Body: { endpoint, parsing, key? }. The key is stored encrypted; pass an empty
 * string to remove it. Omit key to leave it unchanged.
 */
export async function PUT(request: NextRequest) {
  try {
    const caller = await requireApiRole(ROLES.ADMIN);
    const body = (await request.json()) as {
      endpoint?: string;
      parsing?: string;
      key?: string;
    };
    await setTrendConfig(
      {
        endpoint: (body.endpoint ?? "").trim(),
        parsing: (body.parsing ?? "").trim(),
        key: body.key,
      },
      caller,
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
