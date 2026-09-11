import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { getClientEnv } from "@/lib/env";

/**
 * Supabase client for Server Components, Server Actions, and Route
 * Handlers — runs as the currently signed-in user (or anon), so every
 * query is subject to RLS. This is the client to reach for by default.
 *
 * Must be created fresh per request (it captures the request's cookies),
 * never module-level cached.
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  const env = getClientEnv();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component (not a Server Action/Route
            // Handler) — cookies() is read-only there. Safe to ignore as
            // long as proxy.ts also refreshes the session (it does).
          }
        },
      },
    },
  );
}
