import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getServerEnv } from "@/lib/env";

/**
 * Service-role Supabase client — BYPASSES RLS entirely. Only ever call
 * this from trusted server-side code (Server Actions, Route Handlers,
 * scripts) that has already performed its own authorization check.
 *
 * The `server-only` import makes accidentally importing this module from a
 * Client Component a build-time error, not a runtime leak.
 *
 * Not cached at module scope on purpose: each call reads getServerEnv()
 * fresh, which keeps this safe to use from one-off scripts (scripts/seed.ts)
 * as well as the Next.js server runtime.
 */
export function createAdminSupabaseClient() {
  const env = getServerEnv();

  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
