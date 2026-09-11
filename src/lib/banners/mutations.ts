import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { BannerFormInput } from "@/lib/validations/admin";
import { uploadPublicImage, deletePublicImage } from "@/lib/storage/images";
import { STORAGE_BUCKETS } from "@/constants";

export async function createBanner(
  supabase: SupabaseClient<Database>,
  input: BannerFormInput,
  file: File,
) {
  const uploaded = await uploadPublicImage(supabase, STORAGE_BUCKETS.BANNERS, "banners", file);
  if (!uploaded.ok) {
    const messages: Record<string, string> = {
      FILE_TOO_LARGE: "Image must be 5MB or smaller.",
      INVALID_FILE_TYPE: "Only JPEG, PNG, or WebP images are allowed.",
      EMPTY_FILE: "The selected file is empty.",
      UPLOAD_FAILED: "Upload failed. Please try again.",
    };
    return { ok: false as const, error: messages[uploaded.error] };
  }

  const { data, error } = await supabase
    .from("banners")
    .insert({
      title: input.title,
      description: input.description || null,
      image_url: uploaded.url,
      storage_path: uploaded.path,
      button_text: input.buttonText || null,
      button_url: input.buttonUrl || null,
      is_active: input.isActive,
      start_date: input.startDate ?? null,
      end_date: input.endDate ?? null,
      display_order: input.displayOrder,
    })
    .select()
    .single();

  if (error || !data) {
    await deletePublicImage(supabase, STORAGE_BUCKETS.BANNERS, uploaded.path);
    return { ok: false as const, error: "Could not create banner." };
  }
  return { ok: true as const, banner: data };
}

export async function updateBanner(
  supabase: SupabaseClient<Database>,
  id: number,
  input: BannerFormInput,
  file: File | null,
) {
  const updates: Database["public"]["Tables"]["banners"]["Update"] = {
    title: input.title,
    description: input.description || null,
    button_text: input.buttonText || null,
    button_url: input.buttonUrl || null,
    is_active: input.isActive,
    start_date: input.startDate ?? null,
    end_date: input.endDate ?? null,
    display_order: input.displayOrder,
  };

  let oldPath: string | null = null;
  if (file) {
    const { data: existing } = await supabase.from("banners").select("storage_path").eq("id", id).single();
    oldPath = existing?.storage_path ?? null;

    const uploaded = await uploadPublicImage(supabase, STORAGE_BUCKETS.BANNERS, "banners", file);
    if (!uploaded.ok) {
      const messages: Record<string, string> = {
        FILE_TOO_LARGE: "Image must be 5MB or smaller.",
        INVALID_FILE_TYPE: "Only JPEG, PNG, or WebP images are allowed.",
        EMPTY_FILE: "The selected file is empty.",
        UPLOAD_FAILED: "Upload failed. Please try again.",
      };
      return { ok: false as const, error: messages[uploaded.error] };
    }
    updates.image_url = uploaded.url;
    updates.storage_path = uploaded.path;
  }

  const { error } = await supabase.from("banners").update(updates).eq("id", id);
  if (error) return { ok: false as const, error: "Could not update banner." };

  if (file && oldPath) await deletePublicImage(supabase, STORAGE_BUCKETS.BANNERS, oldPath);
  return { ok: true as const };
}

export async function deleteBanner(supabase: SupabaseClient<Database>, id: number) {
  const { data: existing } = await supabase.from("banners").select("storage_path").eq("id", id).single();
  const { error } = await supabase.from("banners").delete().eq("id", id);
  if (error) return { ok: false as const, error: "Could not delete banner." };

  if (existing?.storage_path) await deletePublicImage(supabase, STORAGE_BUCKETS.BANNERS, existing.storage_path);
  return { ok: true as const };
}
