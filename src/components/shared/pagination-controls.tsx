"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PaginationControls({
  page,
  pageCount,
  totalCount,
}: {
  page: number;
  pageCount: number;
  totalCount: number;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function hrefFor(targetPage: number): Route {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(targetPage));
    return `${pathname}?${params.toString()}` as Route;
  }

  if (pageCount <= 1) return null;

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-border pt-4 sm:flex-row">
      <p className="text-sm text-muted-foreground">
        Page {page} of {pageCount} &middot; {totalCount.toLocaleString()} total
      </p>
      <div className="flex gap-2">
        {page <= 1 ? (
          <Button variant="outline" size="sm" disabled>
            <ChevronLeft className="size-4" /> Previous
          </Button>
        ) : (
          <Button asChild variant="outline" size="sm">
            <Link href={hrefFor(page - 1)}>
              <ChevronLeft className="size-4" /> Previous
            </Link>
          </Button>
        )}
        {page >= pageCount ? (
          <Button variant="outline" size="sm" disabled>
            Next <ChevronRight className="size-4" />
          </Button>
        ) : (
          <Button asChild variant="outline" size="sm">
            <Link href={hrefFor(page + 1)}>
              Next <ChevronRight className="size-4" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
