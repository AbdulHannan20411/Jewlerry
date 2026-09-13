"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import type { Route } from "next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Tables } from "@/types/database";

type Banner = Tables<"banners">;

export function BannerCarousel({ banners }: { banners: Banner[] }) {
  const [index, setIndex] = React.useState(0);
  const count = banners.length;

  // Depends on `index`, not just `count`, so every manual navigation
  // (arrow or dot click) restarts the 6s countdown from that moment —
  // otherwise a manual click just before the timer's next tick could be
  // immediately overridden by an auto-advance a moment later, making the
  // click feel like it did nothing (or skipped an extra slide).
  React.useEffect(() => {
    if (count <= 1) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), 6000);
    return () => clearInterval(timer);
  }, [count, index]);

  function goTo(next: number) {
    setIndex(((next % count) + count) % count);
  }

  if (count === 0) return null;
  const banner = banners[index]!;

  return (
    <div className="relative overflow-hidden rounded-lg border border-border/70">
      <div className="relative aspect-[16/7] w-full sm:aspect-[21/8]">
        <Image
          key={banner.id}
          src={banner.image_url}
          alt={banner.title}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-6 sm:p-10">
          <h2 className="font-heading text-2xl font-semibold text-white sm:text-4xl">
            {banner.title}
          </h2>
          {banner.description && (
            <p className="max-w-md text-sm text-white/90 sm:text-base">{banner.description}</p>
          )}
          {banner.button_text && banner.button_url && (
            <Button asChild className="mt-2 w-fit">
              <Link href={banner.button_url as Route}>{banner.button_text}</Link>
            </Button>
          )}
        </div>
      </div>

      {count > 1 && (
        <>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="absolute top-1/2 left-3 -translate-y-1/2 opacity-90"
            onClick={() => goTo(index - 1)}
            aria-label="Previous slide"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="absolute top-1/2 right-3 -translate-y-1/2 opacity-90"
            onClick={() => goTo(index + 1)}
            aria-label="Next slide"
          >
            <ChevronRight className="size-4" />
          </Button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {banners.map((b, i) => (
              <button
                key={b.id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === index}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === index ? "w-6 bg-white" : "w-1.5 bg-white/50",
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
