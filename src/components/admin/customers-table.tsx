"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye } from "lucide-react";
import { DataTable } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import type { CustomerListItem } from "@/lib/customers/queries";

export function CustomersTable({ customers }: { customers: CustomerListItem[] }) {
  const columns = useMemo<ColumnDef<CustomerListItem>[]>(
    () => [
      {
        id: "customer",
        header: "Customer",
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-foreground">{row.original.fullName}</p>
            <p className="text-xs text-muted-foreground">@{row.original.username}</p>
          </div>
        ),
      },
      { accessorKey: "email", header: "Email" },
      {
        id: "phone",
        header: "Phone",
        cell: ({ row }) => row.original.phone ?? "—",
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={row.original.blockedAt ? "destructive" : "success"}>
            {row.original.blockedAt ? "Blocked" : "Active"}
          </Badge>
        ),
      },
      {
        id: "createdAt",
        header: "Joined",
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{formatDate(row.original.createdAt)}</span>,
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button asChild variant="ghost" size="icon" aria-label={`View ${row.original.fullName}`}>
            <Link href={`/admin/customers/${row.original.id}`}>
              <Eye className="size-4" />
            </Link>
          </Button>
        ),
      },
    ],
    [],
  );

  return <DataTable columns={columns} data={customers} emptyMessage="No customers found." />;
}
