import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { nanoid } from "nanoid";
import { validateImageFile } from "@/lib/storage/images";
import { STORAGE_BUCKETS } from "@/constants";
import type { Database } from "@/types/database";

/**
 * Payment screenshots live in a PRIVATE bucket. Path convention
 * (payment-proofs/{customerId}/{orderId}/{nanoid}.{ext}) matches the
 * storage.objects RLS policy in migration 0011, which scopes uploads/
 * reads to `(storage.foldername(name))[1] = auth.uid()::text` (the
 * customer's own folder) or an admin.
 *
 * Takes the caller's own session client (not service-role) so that RLS
 * is actually exercised for the upload — a customer can only ever write
 * into their own folder, structurally, not just by convention.
 */
export async function uploadPaymentProof(
  supabase: SupabaseClient<Database>,
  customerId: string,
  orderId: number,
  file: File,
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  const validationError = validateImageFile(file);
  if (validationError) {
    const messages: Record<string, string> = {
      FILE_TOO_LARGE: "Image must be 5MB or smaller.",
      INVALID_FILE_TYPE: "Only JPEG, PNG, or WebP images are allowed.",
      EMPTY_FILE: "The selected file is empty.",
    };
    return { ok: false, error: messages[validationError] };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || file.type.split("/")[1] || "jpg";
  const path = `${customerId}/${orderId}/${nanoid()}.${ext}`;

  const { error } = await supabase.storage
    .from(STORAGE_BUCKETS.PAYMENT_PROOFS)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) {
    console.error("[uploadPaymentProof] upload failed:", error);
    return { ok: false, error: "Upload failed. Please try again." };
  }

  return { ok: true, path };
}

/**
 * Short-lived signed URL for admin to view a payment screenshot — never a
 * public URL. Uses the caller's own session client; storage RLS
 * (payment_proofs_owner_or_admin_select) is what actually gates whether
 * this succeeds, not this function.
 */
export async function getPaymentProofSignedUrl(
  supabase: SupabaseClient<Database>,
  path: string,
  expiresInSeconds = 300,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKETS.PAYMENT_PROOFS)
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data) {
    console.error("[getPaymentProofSignedUrl] failed:", error);
    return null;
  }
  return data.signedUrl;
}
