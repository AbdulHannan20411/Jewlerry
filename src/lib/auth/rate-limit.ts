import "server-only";
import { headers } from "next/headers";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/** Best-effort client IP from standard proxy headers (Vercel sets x-forwarded-for). */
export async function getRequestIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "unknown";
}

/**
 * Fixed-window rate limit backed by the check_rate_limit Postgres function
 * (no Redis, stays on the free tier). Fails OPEN on an infrastructure
 * error — a rate-limiter outage should never itself lock every user out of
 * signing in — but logs loudly so it's not silently ineffective.
 */
export async function enforceRateLimit(
  bucket: string,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin.rpc("check_rate_limit", {
    p_bucket: bucket,
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    console.error(`[rate-limit] check failed for bucket=${bucket}`, error);
    return true;
  }

  return data === true;
}
