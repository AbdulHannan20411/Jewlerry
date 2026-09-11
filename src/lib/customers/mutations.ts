import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export async function blockCustomer(supabase: SupabaseClient<Database>, customerId: string, reason: string) {
  const { error } = await supabase
    .from("profiles")
    .update({ blocked_at: new Date().toISOString(), blocked_reason: reason })
    .eq("id", customerId)
    .eq("role", "customer");
  if (error) return { ok: false as const, error: "Could not block this customer." };
  return { ok: true as const };
}

export async function unblockCustomer(supabase: SupabaseClient<Database>, customerId: string) {
  const { error } = await supabase
    .from("profiles")
    .update({ blocked_at: null, blocked_reason: null })
    .eq("id", customerId)
    .eq("role", "customer");
  if (error) return { ok: false as const, error: "Could not unblock this customer." };
  return { ok: true as const };
}
