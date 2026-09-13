"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye } from "lucide-react";
import { DataTable } from "@/components/admin/data-table";
import { ReturnRequestStatusBadge } from "@/components/shared/return-request-status-badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import type { ReturnRequestListItem } from "@/lib/returns/queries";

export function ReturnsTable({ requests }: { requests: ReturnRequestListItem[] }) {
  const columns = useMemo<ColumnDef<ReturnRequestListItem>[]>(
    () => [
      {
        id: "order",
        header: "Order",
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-foreground">{row.original.orderNumber}</p>
            <p className="text-xs text-muted-foreground">{row.original.customerName}</p>
          </div>
        ),
      },
      {
        id: "title",
        header: "Title",
        cell: ({ row }) => <span className="text-foreground">{row.original.title}</span>,
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => <ReturnRequestStatusBadge status={row.original.status} />,
      },
      {
        id: "createdAt",
        header: "Requested",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{formatDate(row.original.createdAt)}</span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button asChild variant="ghost" size="icon" aria-label={`Review return request for ${row.original.orderNumber}`}>
            <Link href={`/admin/returns/${row.original.id}`}>
              <Eye className="size-4" />
            </Link>
          </Button>
        ),
      },
    ],
    [],
  );

  return <DataTable columns={columns} data={requests} emptyMessage="No return requests found." />;
}
