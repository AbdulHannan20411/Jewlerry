"use client";

import { useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Star, EyeOff, Eye } from "lucide-react";
import { DataTable } from "@/components/admin/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";
import { toggleReviewHiddenAction } from "@/lib/reviews/actions";
import type { AdminReviewListItem } from "@/lib/reviews/queries";

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex" role="img" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={cn("size-3.5", i < rating ? "fill-primary text-primary" : "text-muted-foreground/40")} />
      ))}
    </div>
  );
}

export function AdminReviewsTable({ reviews }: { reviews: AdminReviewListItem[] }) {
  const router = useRouter();

  const handleToggle = useCallback(
    async (review: AdminReviewListItem) => {
      const result = await toggleReviewHiddenAction(review.id, !review.isHidden);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(review.isHidden ? "Review shown." : "Review hidden.");
      router.refresh();
    },
    [router],
  );

  const columns = useMemo<ColumnDef<AdminReviewListItem>[]>(
    () => [
      {
        id: "review",
        header: "Review",
        cell: ({ row }) => (
          <div className="max-w-md">
            <div className="flex items-center gap-2">
              <StarRow rating={row.original.rating} />
              <span className="text-xs text-muted-foreground">{formatDate(row.original.createdAt)}</span>
            </div>
            {row.original.title && <p className="mt-1 text-sm font-medium text-foreground">{row.original.title}</p>}
            {row.original.comment && (
              <p className="text-sm text-muted-foreground line-clamp-2">{row.original.comment}</p>
            )}
          </div>
        ),
      },
      { accessorKey: "productName", header: "Product" },
      { accessorKey: "customerName", header: "Customer" },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={row.original.isHidden ? "outline" : "success"}>
            {row.original.isHidden ? "Hidden" : "Visible"}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button variant="outline" size="sm" onClick={() => handleToggle(row.original)}>
            {row.original.isHidden ? (
              <>
                <Eye className="size-4" /> Show
              </>
            ) : (
              <>
                <EyeOff className="size-4" /> Hide
              </>
            )}
          </Button>
        ),
      },
    ],
    [handleToggle],
  );

  return <DataTable columns={columns} data={reviews} emptyMessage="No reviews yet." />;
}
