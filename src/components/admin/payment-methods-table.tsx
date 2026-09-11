"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/admin/data-table";
import { ConfirmDeleteButton } from "@/components/admin/confirm-delete-button";
import { PaymentMethodFormDialog } from "@/components/admin/payment-method-form-dialog";
import { Badge } from "@/components/ui/badge";
import { deletePaymentMethodAction } from "@/lib/payments/actions";
import type { PaymentMethodDetail } from "@/lib/payments/queries";

const TYPE_LABELS: Record<PaymentMethodDetail["type"], string> = {
  mobile_wallet: "Mobile wallet",
  bank_transfer: "Bank transfer",
  other: "Other",
};

export function PaymentMethodsTable({ methods }: { methods: PaymentMethodDetail[] }) {
  const columns = useMemo<ColumnDef<PaymentMethodDetail>[]>(
    () => [
      { accessorKey: "name", header: "Name" },
      {
        id: "type",
        header: "Type",
        cell: ({ row }) => TYPE_LABELS[row.original.type],
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={row.original.isActive ? "success" : "outline"}>
            {row.original.isActive ? "Active" : "Inactive"}
          </Badge>
        ),
      },
      { accessorKey: "displayOrder", header: "Order" },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <PaymentMethodFormDialog
              mode="edit"
              methodId={row.original.id}
              defaultValues={{
                type: row.original.type,
                name: row.original.name,
                accountHolderName: row.original.accountHolderName ?? "",
                accountNumber: row.original.accountNumber ?? "",
                iban: row.original.iban ?? "",
                bankName: row.original.bankName ?? "",
                instructions: row.original.instructions ?? "",
                isActive: row.original.isActive,
                displayOrder: row.original.displayOrder,
                swiftCode: row.original.swiftCode ?? "",
                branchCode: row.original.branchCode ?? "",
              }}
            />
            <ConfirmDeleteButton
              itemLabel={row.original.name}
              description="This removes the payment method from checkout. Existing payments referencing it are kept."
              onConfirm={() => deletePaymentMethodAction(row.original.id)}
            />
          </div>
        ),
      },
    ],
    [],
  );

  return <DataTable columns={columns} data={methods} emptyMessage="No payment methods yet." />;
}
