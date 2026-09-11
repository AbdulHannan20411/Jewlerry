import "server-only";
import { cache } from "react";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * site_settings is a singleton row read by the root layout (dark mode
 * flag), the header, and the footer on every storefront page load.
 * Wrapped in React's cache() so those all dedupe to a single query per
 * request instead of three.
 */
export const getSiteSettings = cache(async () => {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("site_settings").select("*").single();
  if (error) {
    console.error("[getSiteSettings] failed:", error);
    return null;
  }
  return data;
});
