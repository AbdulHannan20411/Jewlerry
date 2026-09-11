import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { nanoid } from "nanoid";
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_SIZE_BYTES,
  STORAGE_BUCKETS,
} from "@/constants";
import type { Database } from "@/types/database";

type Bucket = (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];

export type ImageValidationError =
  | "FILE_TOO_LARGE"
  | "INVALID_FILE_TYPE"
  | "EMPTY_FILE";

export function validateImageFile(file: File): ImageValidationError | null {
  if (file.size === 0) return "EMPTY_FILE";
  if (file.size > MAX_IMAGE_SIZE_BYTES) return "FILE_TOO_LARGE";
  if (!(ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
    return "INVALID_FILE_TYPE";
  }
  return null;
}

function extensionFor(file: File): string {
  const fromName = file.name.split(".").pop();
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  return file.type.split("/")[1] ?? "jpg";
}

/**
 * Uploads a validated image to a public bucket (product-images, banners,
 * avatars) under `${folder}/${nanoid}.${ext}`, and returns both the
 * storage path (needed to delete it later) and its public URL.
 *
 * Takes the caller's own Supabase client (not always the service-role
 * client) so storage.objects RLS is actually exercised for admin/owner
 * uploads — see supabase/migrations/..._storage.sql.
 */
export async function uploadPublicImage(
  supabase: SupabaseClient<Database>,
  bucket: Bucket,
  folder: string,
  file: File,
): Promise<
  | { ok: true; path: string; url: string }
  | { ok: false; error: ImageValidationError | "UPLOAD_FAILED" }
> {
  const validationError = validateImageFile(file);
  if (validationError) return { ok: false, error: validationError };

  const path = `${folder}/${nanoid()}.${extensionFor(file)}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    console.error(`[storage] upload failed for ${bucket}/${path}:`, error);
    return { ok: false, error: "UPLOAD_FAILED" };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(path);

  return { ok: true, path, url: publicUrl };
}

export async function deletePublicImage(
  supabase: SupabaseClient<Database>,
  bucket: Bucket,
  path: string,
): Promise<boolean> {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) {
    console.error(`[storage] delete failed for ${bucket}/${path}:`, error);
    return false;
  }
  return true;
}
