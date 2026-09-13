"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, ImageOff } from "lucide-react";
import { DataTable } from "@/components/admin/data-table";
import { ConfirmDeleteButton } from "@/components/admin/confirm-delete-button";
import { StockBadge } from "@/components/shared/stock-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { computeDiscount } from "@/lib/products/pricing";
import { deleteProductAction } from "@/lib/products/actions";
import type { ProductListItem } from "@/lib/products/queries";

export function ProductsTable({
  products,
  lowStockThreshold,
}: {
  products: ProductListItem[];
  lowStockThreshold?: number;
}) {
  const columns = useMemo<ColumnDef<ProductListItem>[]>(
    () => [
      {
        id: "image",
        header: "",
        cell: ({ row }) => {
          const product = row.original;
          return (
            <div className="relative size-12 overflow-hidden rounded-md border border-border bg-muted">
              {product.primary_image_url ? (
                <Image
                  src={product.primary_image_url}
                  alt={product.name}
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center text-muted-foreground">
                  <ImageOff className="size-4" />
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <div className="max-w-[220px]">
            <p className="truncate font-medium text-foreground">{row.original.name}</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {row.original.tags.slice(0, 3).map((tag) => (
                <Badge key={tag.id} variant="secondary" className="text-[10px]">
                  {tag.name}
                </Badge>
              ))}
            </div>
          </div>
        ),
      },
      {
        id: "price",
        header: "Price",
        cell: ({ row }) => {
          const { price_before_discount, price_after_discount } = row.original;
          const { percentage } = computeDiscount(price_before_discount, price_after_discount);
          return (
            <div>
              <p className="font-medium text-foreground">
                {formatCurrency(price_after_discount)}
              </p>
              {percentage > 0 && (
                <p className="text-xs text-muted-foreground">
                  <span className="line-through">{formatCurrency(price_before_discount)}</span>{" "}
                  <span className="text-success">-{percentage}%</span>
                </p>
              )}
            </div>
          );
        },
      },
      {
        id: "stock",
        header: "Stock",
        cell: ({ row }) => (
          <StockBadge quantity={row.original.quantity_in_stock} threshold={lowStockThreshold} />
        ),
      },
      {
        id: "restocked",
        header: "Restocked",
        cell: ({ row }) => {
          const { restock_count, last_restocked_at } = row.original;
          if (restock_count === 0 || !last_restocked_at) {
            return <span className="text-sm text-muted-foreground">Never</span>;
          }
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className="cursor-default">
                  Restocked ×{restock_count}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>Last restocked {formatDateTime(last_restocked_at)}</TooltipContent>
            </Tooltip>
          );
        },
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) =>
          row.original.is_active ? (
            <Badge variant="success">Active</Badge>
          ) : (
            <Badge variant="outline">Inactive</Badge>
          ),
      },
      {
        id: "created",
        header: "Created",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatDate(row.original.created_at)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button asChild variant="ghost" size="icon" aria-label={`Edit ${row.original.name}`}>
              <Link href={`/admin/products/${row.original.id}`}>
                <Pencil className="size-4" />
              </Link>
            </Button>
            <ConfirmDeleteButton
              itemLabel={row.original.name}
              description="This permanently removes the product and its images. Existing orders keep their own record of what was purchased, so past invoices are unaffected."
              onConfirm={() => deleteProductAction(row.original.id)}
            />
          </div>
        ),
      },
    ],
    [lowStockThreshold],
  );

  return <DataTable columns={columns} data={products} emptyMessage="No products found." />;
}
