import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

/**
 * Application header. The session-aware area is plumbed for Step 2: it currently
 * renders the logged-out state (a login link). Step 2 replaces this with a
 * server-side session read that shows the user menu when authenticated.
 */
export function Header() {
  return (
    <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          {APP_NAME}
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link
            href="/login"
            className="rounded-md bg-[var(--color-accent)] px-3 py-1.5 font-medium text-white hover:opacity-90"
          >
            로그인
          </Link>
        </nav>
      </div>
    </header>
  );
}
