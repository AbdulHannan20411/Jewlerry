"use client";

import * as React from "react";
import Image from "next/image";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

export function ProductImageGallery({
  images,
  productName,
}: {
  images: { id: number; url: string; altText: string }[];
  productName: string;
}) {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const active = images[activeIndex];

  if (images.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-lg border border-border/70 bg-muted text-muted-foreground">
        <ImageOff className="size-12" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-lg border border-border/70 bg-muted">
        <Image
          key={active!.id}
          src={active!.url}
          alt={active!.altText || productName}
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
        />
      </div>
      {images.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {images.map((img, index) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`View image ${index + 1} of ${images.length}`}
              aria-current={index === activeIndex}
              className={cn(
                "relative aspect-square overflow-hidden rounded-md border transition-colors",
                index === activeIndex ? "border-primary" : "border-border/70 hover:border-muted-foreground",
              )}
            >
              <Image src={img.url} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
