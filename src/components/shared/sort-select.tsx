"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** Drives the `sort` URL param. Reused by the storefront product list too. */
export function SortSelect({
  value,
  options,
  paramName = "sort",
  label = "Sort by",
}: {
  value: string;
  options: { value: string; label: string }[];
  paramName?: string;
  label?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(paramName, next);
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}` as Route);
  }

  return (
    <Select value={value} onValueChange={handleChange}>
      <SelectTrigger className="w-[180px]" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
