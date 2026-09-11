"use client";

import { useMemo } from "react";
import Image from "next/image";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/admin/data-table";
import { ConfirmDeleteButton } from "@/components/admin/confirm-delete-button";
import { BannerFormDialog } from "@/components/admin/banner-form-dialog";
import { Badge } from "@/components/ui/badge";
import { deleteBannerAction } from "@/lib/banners/actions";
import type { Tables } from "@/types/database";

type Banner = Tables<"banners">;

export function BannersTable({ banners }: { banners: Banner[] }) {
  const columns = useMemo<ColumnDef<Banner>[]>(
    () => [
      {
        id: "image",
        header: "",
        cell: ({ row }) => (
          <div className="relative size-12 overflow-hidden rounded-md bg-muted">
            <Image src={row.original.image_url} alt={row.original.title} fill className="object-cover" />
          </div>
        ),
      },
      { accessorKey: "title", header: "Title" },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={row.original.is_active ? "success" : "outline"}>
            {row.original.is_active ? "Active" : "Inactive"}
          </Badge>
        ),
      },
      { accessorKey: "display_order", header: "Order" },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <BannerFormDialog
              mode="edit"
              bannerId={row.original.id}
              currentImageUrl={row.original.image_url}
              defaultValues={{
                title: row.original.title,
                description: row.original.description ?? "",
                buttonText: row.original.button_text ?? "",
                buttonUrl: row.original.button_url ?? "",
                isActive: row.original.is_active,
                startDate: row.original.start_date,
                endDate: row.original.end_date,
                displayOrder: row.original.display_order,
              }}
            />
            <ConfirmDeleteButton
              itemLabel={row.original.title}
              onConfirm={() => deleteBannerAction(row.original.id)}
            />
          </div>
        ),
      },
    ],
    [],
  );

  return <DataTable columns={columns} data={banners} emptyMessage="No banners yet." />;
}
