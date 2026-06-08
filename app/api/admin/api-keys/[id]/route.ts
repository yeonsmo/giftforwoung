import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole, jsonError } from "@/lib/auth/api";
import { ROLES } from "@/lib/constants";
import { setApiKeyActive, deleteApiKey } from "@/lib/webhooks/keys";

export const dynamic = "force-dynamic";

/** PATCH - revoke or re-activate an API key (spec 7-3). Body: { is_active }. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireApiRole(ROLES.ADMIN);
    const { id } = await params;
    const body = (await request.json()) as { is_active?: boolean };
    await setApiKeyActive(id, Boolean(body.is_active));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}

/** DELETE - permanently remove an API key. Admin+. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireApiRole(ROLES.ADMIN);
    const { id } = await params;
    await deleteApiKey(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
