"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/admin/data-table";
import { ConfirmDeleteButton } from "@/components/admin/confirm-delete-button";
import { CategoryFormDialog } from "@/components/admin/category-form-dialog";
import { Badge } from "@/components/ui/badge";
import { deleteCategoryAction } from "@/lib/products/actions";
import type { Tables } from "@/types/database";

type Category = Tables<"categories">;

export function CategoriesTable({ categories }: { categories: Category[] }) {
  const columns = useMemo<ColumnDef<Category>[]>(
    () => [
      { accessorKey: "name", header: "Name" },
      { accessorKey: "display_order", header: "Order" },
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
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <CategoryFormDialog
              mode="edit"
              categoryId={row.original.id}
              defaultValues={{
                name: row.original.name,
                displayOrder: row.original.display_order,
                isActive: row.original.is_active,
              }}
            />
            <ConfirmDeleteButton
              itemLabel={row.original.name}
              description="Products in this category will become uncategorized, not deleted."
              onConfirm={() => deleteCategoryAction(row.original.id)}
            />
          </div>
        ),
      },
    ],
    [],
  );

  return <DataTable columns={columns} data={categories} emptyMessage="No categories yet." />;
}
