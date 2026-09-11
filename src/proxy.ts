import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

/**
 * Next.js 16 renamed `middleware.ts` -> `proxy.ts` (nodejs runtime only,
 * no more Edge option here). Functionally this still does exactly what
 * Supabase's SSR middleware guide describes: refresh the auth session's
 * cookies on every request, plus a fast *optimistic* redirect for
 * signed-out visitors hitting /account or /admin.
 *
 * This is intentionally NOT the real authorization boundary — per the
 * Next.js docs, Proxy "should not be used as a full session management or
 * authorization solution." The actual role/blocked/must-change-password
 * checks live in lib/permissions and are called from every protected
 * Server Component layout *and* every Server Action/Route Handler
 * individually (Server Functions are directly POST-able and would
 * otherwise bypass a layout-only check).
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Misconfigured env — let the request through rather than hard-crash
    // every route; pages that need Supabase will surface a clear error.
    return response;
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Refreshes the session token if it's expired; also the call that makes
  // Supabase re-issue Set-Cookie headers via setAll() above when needed.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAccountRoute = pathname.startsWith("/account");
  const isAdminRoute = pathname.startsWith("/admin");

  if (!user && (isAccountRoute || isAdminRoute)) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("returnTo", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Skip static assets and Next internals; run on everything else so the
     * session cookie stays fresh across the whole app, not just the
     * protected routes.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|gif)$).*)",
  ],
};
