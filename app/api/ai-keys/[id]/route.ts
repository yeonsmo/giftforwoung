import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole, jsonError } from "@/lib/auth/api";
import { ROLES } from "@/lib/constants";
import { deleteKey } from "@/lib/ai/keys-store";

export const dynamic = "force-dynamic";

/** DELETE - remove an AI key. Admin+. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireApiRole(ROLES.ADMIN);
    const { id } = await params;
    await deleteKey(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
