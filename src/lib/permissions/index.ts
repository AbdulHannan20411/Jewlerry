import "server-only";
import { redirect, forbidden } from "next/navigation";
import type { Route } from "next";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type CurrentProfile = Tables<"profiles">;

/**
 * Reads the current session's profile row, or null if signed out. Never
 * throws/redirects — use this when a page/component needs to branch on
 * "signed in or not" rather than hard-require one.
 */
export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile;
}

/**
 * Requires a signed-in, non-blocked, non-deleted customer or admin.
 * Redirects to sign-in (with a return path) if signed out; sends a
 * blocked/deleted account to a dedicated explanation page rather than a
 * silent redirect loop.
 *
 * IMPORTANT: call this from every Server Action and Route Handler that
 * needs an authenticated user — not just from the page/layout that renders
 * the form. Server Functions are directly POST-able, bypassing whatever a
 * layout would otherwise have gated (see Next.js Data Security guide).
 */
export async function requireUser(
  options: { returnTo?: string } = {},
): Promise<CurrentProfile> {
  const profile = await getCurrentProfile();

  if (!profile) {
    const target = options.returnTo
      ? `/sign-in?returnTo=${encodeURIComponent(options.returnTo)}`
      : "/sign-in";
    redirect(target as Route);
  }

  if (profile.deleted_at) {
    redirect("/sign-in");
  }

  if (profile.blocked_at) {
    redirect("/account-suspended");
  }

  return profile;
}

/** Requires an authenticated admin. Renders app/forbidden.tsx otherwise. */
export async function requireAdmin(): Promise<CurrentProfile> {
  const profile = await requireUser();
  if (profile.role !== "admin") {
    forbidden();
  }
  return profile;
}

/**
 * Requires an authenticated customer (any signed-in, non-admin account is
 * fine too — this just excludes the small set of admin-only flows an admin
 * account itself should never hit, e.g. "my orders" for an admin browsing
 * their own admin profile). Most customer-area code should just use
 * requireUser(); this exists for the few places that are truly
 * customer-only.
 */
export async function requireCustomer(): Promise<CurrentProfile> {
  return requireUser();
}

/** True if the current session belongs to an admin. Never throws/redirects. */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const profile = await getCurrentProfile();
  return profile?.role === "admin" && !profile.deleted_at;
}
