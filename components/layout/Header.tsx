import Link from "next/link";
import { APP_NAME } from "@/lib/constants";
import { getSessionUser } from "@/lib/auth/session";
import { logout } from "@/lib/auth/actions";

/**
 * Application header. Reads the session server-side and shows the user menu when
 * authenticated, or a login link otherwise. getSessionUser returns null when the
 * auth backend is unreachable, so public pages still render.
 */
export async function Header() {
  const user = await getSessionUser();

  return (
    <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href={user ? "/dashboard" : "/"} className="text-sm font-semibold tracking-tight">
          {APP_NAME}
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          {user ? (
            <>
              <span className="text-xs text-[var(--color-muted)]">{user.email}</span>
              <form action={logout}>
                <button
                  type="submit"
                  className="rounded-md border border-[var(--color-border)] px-3 py-1.5 font-medium hover:bg-[var(--color-background)]"
                >
                  로그아웃
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-md bg-[var(--color-accent)] px-3 py-1.5 font-medium text-white hover:opacity-90"
            >
              로그인
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
