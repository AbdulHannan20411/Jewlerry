"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

/**
 * Live search box that drives the `q` URL param (and resets `page` to 1)
 * on every keystroke — no debounce. `router.replace` (not `push`) so each
 * keystroke updates the current history entry instead of stacking one
 * back-button step per character typed.
 */
export function SearchInput({
  placeholder = "Search...",
  paramName = "q",
}: {
  placeholder?: string;
  paramName?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = React.useState(searchParams.get(paramName) ?? "");

  function navigate(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next) params.set(paramName, next);
    else params.delete(paramName);
    params.set("page", "1");
    router.replace(`${pathname}?${params.toString()}` as Route, { scroll: false });
  }

  return (
    <div className="relative w-full sm:max-w-xs">
      <Search
        className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          navigate(e.target.value);
        }}
        className="pl-8"
        aria-label={placeholder}
      />
    </div>
  );
}
