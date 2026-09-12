"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/admin/data-table";
import { formatDateTime } from "@/lib/utils";
import type { AuditLogEntry } from "@/lib/audit-log/queries";

export function AuditLogTable({ entries }: { entries: AuditLogEntry[] }) {
  const columns = useMemo<ColumnDef<AuditLogEntry>[]>(
    () => [
      {
        id: "createdAt",
        header: "When",
        cell: ({ row }) => (
          <span className="text-sm whitespace-nowrap text-muted-foreground">
            {formatDateTime(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: "actor",
        header: "Actor",
        cell: ({ row }) => row.original.actorName ?? "Unknown",
      },
      {
        id: "action",
        header: "Action",
        cell: ({ row }) => <code className="text-xs">{row.original.action}</code>,
      },
      {
        id: "entity",
        header: "Entity",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.entityType}
            {row.original.entityId ? ` #${row.original.entityId}` : ""}
          </span>
        ),
      },
      {
        id: "metadata",
        header: "Details",
        cell: ({ row }) => {
          const meta = row.original.metadata;
          const text = meta && typeof meta === "object" && Object.keys(meta).length > 0 ? JSON.stringify(meta) : "—";
          return (
            <span className="block max-w-xs truncate text-xs text-muted-foreground" title={text}>
              {text}
            </span>
          );
        },
      },
    ],
    [],
  );

  return <DataTable columns={columns} data={entries} emptyMessage="No activity recorded yet." />;
}
