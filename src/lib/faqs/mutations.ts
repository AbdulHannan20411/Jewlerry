import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { FaqFormInput } from "@/lib/validations/admin";

export async function createFaq(supabase: SupabaseClient<Database>, input: FaqFormInput) {
  const { data, error } = await supabase
    .from("faqs")
    .insert({
      question: input.question,
      answer: input.answer,
      is_active: input.isActive,
      display_order: input.displayOrder,
    })
    .select()
    .single();

  if (error || !data) return { ok: false as const, error: "Could not create FAQ." };
  return { ok: true as const, faq: data };
}

export async function updateFaq(supabase: SupabaseClient<Database>, id: number, input: FaqFormInput) {
  const { error } = await supabase
    .from("faqs")
    .update({
      question: input.question,
      answer: input.answer,
      is_active: input.isActive,
      display_order: input.displayOrder,
    })
    .eq("id", id);

  if (error) return { ok: false as const, error: "Could not update FAQ." };
  return { ok: true as const };
}

export async function deleteFaq(supabase: SupabaseClient<Database>, id: number) {
  const { error } = await supabase.from("faqs").delete().eq("id", id);
  if (error) return { ok: false as const, error: "Could not delete FAQ." };
  return { ok: true as const };
}
