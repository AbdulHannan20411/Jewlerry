"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/admin/data-table";
import { ConfirmDeleteButton } from "@/components/admin/confirm-delete-button";
import { FaqFormDialog } from "@/components/admin/faq-form-dialog";
import { Badge } from "@/components/ui/badge";
import { deleteFaqAction } from "@/lib/faqs/actions";
import type { Tables } from "@/types/database";

type Faq = Tables<"faqs">;

export function FaqsTable({ faqs }: { faqs: Faq[] }) {
  const columns = useMemo<ColumnDef<Faq>[]>(
    () => [
      { accessorKey: "question", header: "Question" },
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
            <FaqFormDialog
              mode="edit"
              faqId={row.original.id}
              defaultValues={{
                question: row.original.question,
                answer: row.original.answer,
                isActive: row.original.is_active,
                displayOrder: row.original.display_order,
              }}
            />
            <ConfirmDeleteButton itemLabel={row.original.question} onConfirm={() => deleteFaqAction(row.original.id)} />
          </div>
        ),
      },
    ],
    [],
  );

  return <DataTable columns={columns} data={faqs} emptyMessage="No FAQs yet." />;
}
