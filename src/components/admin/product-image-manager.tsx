"use client";

import * as React from "react";
import Image from "next/image";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, ImagePlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  uploadProductImageAction,
  deleteProductImageAction,
  reorderProductImagesAction,
} from "@/lib/products/actions";
import type { ProductImageRow } from "@/lib/products/queries";

export function ProductImageManager({
  productId,
  initialImages,
}: {
  productId: number;
  initialImages: ProductImageRow[];
}) {
  const [images, setImages] = React.useState(initialImages);
  const [uploading, setUploading] = React.useState(false);
  const [pendingId, setPendingId] = React.useState<number | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.set("file", file);
    const result = await uploadProductImageAction(productId, formData);
    setUploading(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Image uploaded.");
    // Server Actions can't easily return the new row shape here without
    // another round trip; a full data refresh keeps this component simple.
    window.location.reload();
  }

  async function handleDelete(imageId: number) {
    setPendingId(imageId);
    const result = await deleteProductImageAction(productId, imageId);
    setPendingId(null);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setImages((prev) => prev.filter((img) => img.id !== imageId));
    toast.success("Image removed.");
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target]!, next[index]!];
    setImages(next);
    await reorderProductImagesAction(
      productId,
      next.map((img) => img.id),
    );
  }

  return (
    <div className="space-y-4">
      {images.length === 0 ? (
        <p className="text-sm text-muted-foreground">No images yet. Upload at least one.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((image, index) => (
            <div
              key={image.id}
              className="group relative aspect-square overflow-hidden rounded-md border border-border bg-muted"
            >
              <Image
                src={image.url}
                alt={image.altText}
                fill
                sizes="200px"
                className="object-cover"
              />
              {index === 0 && (
                <span className="absolute top-1.5 left-1.5 rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-medium text-foreground">
                  Primary
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-background/90 p-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  aria-label="Move earlier"
                >
                  <ArrowLeft className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-6 text-destructive hover:text-destructive"
                  disabled={pendingId === image.id}
                  onClick={() => handleDelete(image.id)}
                  aria-label="Remove image"
                >
                  {pendingId === image.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <X className="size-3.5" />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  disabled={index === images.length - 1}
                  onClick={() => move(index, 1)}
                  aria-label="Move later"
                >
                  <ArrowRight className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelected}
        className="hidden"
      />
      <Button
        type="button"
        variant="outline"
        disabled={uploading}
        onClick={() => fileInputRef.current?.click()}
      >
        {uploading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <ImagePlus className="size-4" />
        )}
        {uploading ? "Uploading..." : "Upload image"}
      </Button>
      <p className="text-xs text-muted-foreground">JPEG, PNG, or WebP. Max 5MB.</p>
    </div>
  );
}
