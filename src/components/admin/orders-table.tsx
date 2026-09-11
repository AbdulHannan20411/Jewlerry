"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye } from "lucide-react";
import { DataTable } from "@/components/admin/data-table";
import { OrderStatusBadge } from "@/components/shared/order-status-badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { OrderListItem } from "@/lib/orders/queries";

export function OrdersTable({ orders }: { orders: OrderListItem[] }) {
  const columns = useMemo<ColumnDef<OrderListItem>[]>(
    () => [
      {
        id: "orderNumber",
        header: "Order",
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-foreground">{row.original.orderNumber}</p>
            <p className="text-xs text-muted-foreground">{row.original.invoiceNumber}</p>
          </div>
        ),
      },
      { accessorKey: "customerName", header: "Customer" },
      {
        id: "items",
        header: "Items",
        cell: ({ row }) => row.original.itemCount,
      },
      {
        id: "total",
        header: "Total",
        cell: ({ row }) => formatCurrency(row.original.total, row.original.currencyCode),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => <OrderStatusBadge status={row.original.status} />,
      },
      {
        id: "createdAt",
        header: "Created",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{formatDate(row.original.createdAt)}</span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button asChild variant="ghost" size="icon" aria-label={`View order ${row.original.orderNumber}`}>
            <Link href={`/admin/orders/${row.original.id}`}>
              <Eye className="size-4" />
            </Link>
          </Button>
        ),
      },
    ],
    [],
  );

  return <DataTable columns={columns} data={orders} emptyMessage="No orders found." />;
}
