"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import { Star } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

export interface FilterTagOption {
  slug: string;
  name: string;
}

export function ProductFilters({
  tags,
  categories,
}: {
  tags: FilterTagOption[];
  categories: FilterTagOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeTag = searchParams.get("tag") ?? "";
  const activeCategory = searchParams.get("category") ?? "";
  const activeRating = searchParams.get("minRating") ?? "";
  const inStockOnly = searchParams.get("inStockOnly") === "true";
  const [minPrice, setMinPrice] = React.useState(searchParams.get("minPrice") ?? "");
  const [maxPrice, setMaxPrice] = React.useState(searchParams.get("maxPrice") ?? "");

  function navigate(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
    }
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}` as Route);
  }

  return (
    <div className="space-y-6">
      {categories.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-medium text-foreground">Category</h3>
          <div className="space-y-1.5">
            <FilterLink
              label="All categories"
              active={!activeCategory}
              onClick={() => navigate({ category: null })}
            />
            {categories.map((c) => (
              <FilterLink
                key={c.slug}
                label={c.name}
                active={activeCategory === c.slug}
                onClick={() => navigate({ category: c.slug })}
              />
            ))}
          </div>
        </div>
      )}

      {tags.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-medium text-foreground">Tags</h3>
          <div className="space-y-1.5">
            <FilterLink label="All tags" active={!activeTag} onClick={() => navigate({ tag: null })} />
            {tags.map((t) => (
              <FilterLink
                key={t.slug}
                label={t.name}
                active={activeTag === t.slug}
                onClick={() => navigate({ tag: t.slug })}
              />
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="mb-2 text-sm font-medium text-foreground">Price range</h3>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min="0"
            placeholder="Min"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            onBlur={() => navigate({ minPrice })}
            className="h-8"
          />
          <span className="text-muted-foreground">-</span>
          <Input
            type="number"
            min="0"
            placeholder="Max"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            onBlur={() => navigate({ maxPrice })}
            className="h-8"
          />
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium text-foreground">Minimum rating</h3>
        <RadioGroup
          value={activeRating}
          onValueChange={(v) => navigate({ minRating: v })}
        >
          {["4", "3", "2", "1"].map((r) => (
            <div key={r} className="flex items-center gap-2">
              <RadioGroupItem value={r} id={`rating-${r}`} />
              <Label htmlFor={`rating-${r}`} className="flex items-center gap-1 font-normal">
                <span className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "size-3.5",
                        i < Number(r) ? "fill-primary text-primary" : "text-muted-foreground",
                      )}
                    />
                  ))}
                </span>
                &amp; up
              </Label>
            </div>
          ))}
        </RadioGroup>
        {activeRating && (
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs"
            onClick={() => navigate({ minRating: null })}
          >
            Clear rating
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="in-stock-only"
          checked={inStockOnly}
          onCheckedChange={(checked) => navigate({ inStockOnly: checked ? "true" : null })}
        />
        <Label htmlFor="in-stock-only" className="font-normal">
          In stock only
        </Label>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push(pathname as Route)}
        className="w-full"
      >
        Clear all filters
      </Button>
    </div>
  );
}

function FilterLink({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "block w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors",
        active
          ? "bg-accent font-medium text-accent-foreground"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}
