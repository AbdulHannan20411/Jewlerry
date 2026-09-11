"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** Drives an arbitrary URL filter param (status, payment status, etc). */
export function FilterSelect({
  paramName,
  value,
  allLabel,
  options,
  placeholder,
}: {
  paramName: string;
  value?: string;
  allLabel: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "__all__") params.delete(paramName);
    else params.set(paramName, next);
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}` as Route);
  }

  return (
    <Select value={value ?? "__all__"} onValueChange={handleChange}>
      <SelectTrigger className="w-[180px]" aria-label={placeholder ?? paramName}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__all__">{allLabel}</SelectItem>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
