import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/lib/env";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/** Public paths that never require authentication. */
const PUBLIC_PATHS = ["/", "/login"];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  // Auth endpoints and the health check stay public.
  if (pathname.startsWith("/api/health")) return true;
  if (pathname.startsWith("/api/auth")) return true;
  return false;
}

/**
 * Refreshes the Supabase auth session and guards protected routes. Unauthenticated
 * users hitting a protected page are redirected to /login. API routes are not
 * redirected here; they enforce auth themselves and return 401/403 JSON.
 * Role-level gating (admin, super admin) is enforced in layouts/pages and APIs.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  let user = null;
  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch {
    // Auth backend unreachable; treat as unauthenticated. Protected routes
    // then redirect to /login and public routes still render.
    user = null;
  }

  const pathname = request.nextUrl.pathname;
  const isApi = pathname.startsWith("/api");

  if (!user && !isApi && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
