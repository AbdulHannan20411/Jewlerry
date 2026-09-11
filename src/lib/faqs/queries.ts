import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export async function getAllFaqs(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase.from("faqs").select("*").order("display_order");
  if (error) {
    console.error("[getAllFaqs] failed:", error);
    return [];
  }
  return data;
}
