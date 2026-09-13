import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { nanoid } from "nanoid";
import { validateImageFile } from "@/lib/storage/images";
import { STORAGE_BUCKETS } from "@/constants";
import type { Database } from "@/types/database";

const VALIDATION_MESSAGES: Record<string, string> = {
  FILE_TOO_LARGE: "Image must be 5MB or smaller.",
  INVALID_FILE_TYPE: "Only JPEG, PNG, or WebP images are allowed.",
  EMPTY_FILE: "The selected file is empty.",
};

/**
 * Return proof photos live in a PRIVATE bucket, same shape as
 * payment-proofs (path: return-proofs/{customerId}/{orderId}/{nanoid}.{ext}),
 * gated by the matching storage.objects RLS policy in migration 0020.
 * Uploads sequentially and rolls back (deletes) anything already uploaded
 * the moment one file fails, so a partial return request never gets
 * created with only some of its evidence attached.
 */
export async function uploadReturnProofs(
  supabase: SupabaseClient<Database>,
  customerId: string,
  orderId: number,
  files: File[],
): Promise<{ ok: true; paths: string[] } | { ok: false; error: string }> {
  const paths: string[] = [];

  for (const file of files) {
    const validationError = validateImageFile(file);
    if (validationError) {
      if (paths.length > 0) {
        await supabase.storage.from(STORAGE_BUCKETS.RETURN_PROOFS).remove(paths);
      }
      return { ok: false, error: VALIDATION_MESSAGES[validationError] };
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || file.type.split("/")[1] || "jpg";
    const path = `${customerId}/${orderId}/${nanoid()}.${ext}`;

    const { error } = await supabase.storage
      .from(STORAGE_BUCKETS.RETURN_PROOFS)
      .upload(path, file, { contentType: file.type, upsert: false });

    if (error) {
      console.error("[uploadReturnProofs] upload failed:", error);
      if (paths.length > 0) {
        await supabase.storage.from(STORAGE_BUCKETS.RETURN_PROOFS).remove(paths);
      }
      return { ok: false, error: "Upload failed. Please try again." };
    }

    paths.push(path);
  }

  return { ok: true, paths };
}

/** Short-lived signed URLs for admin/customer to view return proof photos — never public URLs. */
export async function getReturnProofSignedUrls(
  supabase: SupabaseClient<Database>,
  paths: string[],
  expiresInSeconds = 300,
): Promise<string[]> {
  if (paths.length === 0) return [];
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKETS.RETURN_PROOFS)
    .createSignedUrls(paths, expiresInSeconds);

  if (error || !data) {
    console.error("[getReturnProofSignedUrls] failed:", error);
    return [];
  }
  return data
    .map((d) => d.signedUrl)
    .filter((url): url is string => !!url);
}
