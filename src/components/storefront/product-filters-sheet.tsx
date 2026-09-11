"use client";

import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ProductFilters, type FilterTagOption } from "@/components/storefront/product-filters";

export function ProductFiltersSheet({
  tags,
  categories,
}: {
  tags: FilterTagOption[];
  categories: FilterTagOption[];
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="md:hidden">
          <SlidersHorizontal className="size-4" /> Filters
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-6">
          <ProductFilters tags={tags} categories={categories} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
