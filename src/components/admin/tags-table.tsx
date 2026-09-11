"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/admin/data-table";
import { ConfirmDeleteButton } from "@/components/admin/confirm-delete-button";
import { TagFormDialog } from "@/components/admin/tag-form-dialog";
import { deleteTagAction } from "@/lib/products/actions";
import type { Tables } from "@/types/database";

type Tag = Tables<"tags">;

export function TagsTable({ tags }: { tags: Tag[] }) {
  const columns = useMemo<ColumnDef<Tag>[]>(
    () => [
      { accessorKey: "name", header: "Name" },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <TagFormDialog
              mode="edit"
              tagId={row.original.id}
              defaultValues={{ name: row.original.name }}
            />
            <ConfirmDeleteButton
              itemLabel={row.original.name}
              description="Removing this tag also removes it from every product it's attached to."
              onConfirm={() => deleteTagAction(row.original.id)}
            />
          </div>
        ),
      },
    ],
    [],
  );

  return <DataTable columns={columns} data={tags} emptyMessage="No tags yet." />;
}
