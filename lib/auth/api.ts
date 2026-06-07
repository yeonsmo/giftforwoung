import "server-only";
import { NextResponse } from "next/server";
import { getSessionUser, type SessionUser } from "@/lib/auth/session";
import { roleAtLeast } from "@/lib/auth/roles";
import type { Role } from "@/lib/constants";

/** Thrown by API auth guards; carries an HTTP status. */
export class AuthError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * Asserts the caller is authenticated, active, and has at least `min` role.
 * Throws AuthError otherwise. Use inside route handlers wrapped by
 * jsonError() in a try/catch.
 */
export async function requireApiRole(min: Role): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new AuthError(401, "인증이 필요합니다.");
  if (!user.isActive) throw new AuthError(403, "비활성화된 계정입니다.");
  if (!roleAtLeast(user.role, min)) throw new AuthError(403, "권한이 부족합니다.");
  return user;
}

/**
 * Converts a thrown error into a JSON response. Per spec 9-4, the raw error
 * message is surfaced rather than being silently recovered.
 */
export function jsonError(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  const message = error instanceof Error ? error.message : String(error);
  return NextResponse.json({ error: message }, { status: 500 });
}
