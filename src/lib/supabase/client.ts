"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { getClientEnv } from "@/lib/env";

let browserClient: ReturnType<typeof createBrowserClient<Database>> | undefined;

/**
 * Supabase client for Client Components. Safe to call repeatedly — reuses
 * a single instance per browser tab. Uses only the public anon key; RLS
 * still applies.
 */
export function createBrowserSupabaseClient() {
  if (browserClient) return browserClient;

  const env = getClientEnv();
  browserClient = createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  return browserClient;
}
