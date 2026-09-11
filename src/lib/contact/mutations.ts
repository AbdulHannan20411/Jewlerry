import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export async function markContactMessageRead(supabase: SupabaseClient<Database>, id: number) {
  const { error } = await supabase.from("contact_messages").update({ is_read: true }).eq("id", id);
  if (error) return { ok: false as const, error: "Could not update message." };
  return { ok: true as const };
}

export async function deleteContactMessage(supabase: SupabaseClient<Database>, id: number) {
  const { error } = await supabase.from("contact_messages").delete().eq("id", id);
  if (error) return { ok: false as const, error: "Could not delete message." };
  return { ok: true as const };
}
