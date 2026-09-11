"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TextField, TextareaField } from "@/components/forms/text-field";
import { SelectField, SwitchField } from "@/components/forms/select-field";
import { FieldGroup } from "@/components/ui/field";
import {
  paymentMethodFormSchema,
  type PaymentMethodFormInput,
  type PaymentMethodFormRawInput,
} from "@/lib/validations/admin";
import { createPaymentMethodAction, updatePaymentMethodAction } from "@/lib/payments/actions";

const TYPE_OPTIONS = [
  { value: "mobile_wallet", label: "Mobile wallet (JazzCash, EasyPaisa, ...)" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "other", label: "Other" },
];

const DEFAULTS: PaymentMethodFormRawInput = {
  type: "bank_transfer",
  name: "",
  accountHolderName: "",
  accountNumber: "",
  iban: "",
  bankName: "",
  instructions: "",
  isActive: true,
  displayOrder: 0,
  swiftCode: "",
  branchCode: "",
};

export function PaymentMethodFormDialog({
  mode,
  methodId,
  defaultValues,
}: {
  mode: "create" | "edit";
  methodId?: number;
  defaultValues?: PaymentMethodFormRawInput;
}) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<PaymentMethodFormRawInput, unknown, PaymentMethodFormInput>({
    resolver: zodResolver(paymentMethodFormSchema),
    defaultValues: defaultValues ?? DEFAULTS,
  });

  const type = watch("type");

  function onSubmit(values: PaymentMethodFormInput) {
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createPaymentMethodAction(values)
          : await updatePaymentMethodAction(methodId!, values);

      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(mode === "create" ? "Payment method created." : "Payment method updated.");
      setOpen(false);
      if (mode === "create") reset(DEFAULTS);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {mode === "create" ? (
          <Button>
            <Plus className="size-4" /> New payment method
          </Button>
        ) : (
          <Button variant="ghost" size="icon" aria-label="Edit payment method">
            <Pencil className="size-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "New payment method" : "Edit payment method"}</DialogTitle>
          <DialogDescription>
            Shown to customers at checkout with instructions for sending payment manually.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <SelectField
              name="type"
              control={control}
              label="Type"
              options={TYPE_OPTIONS}
              placeholder="Select a type"
            />
            <TextField label="Display name" register={register("name")} error={errors.name} />
            <TextField
              label="Account holder name"
              register={register("accountHolderName")}
              error={errors.accountHolderName}
            />
            <TextField
              label="Account / wallet number"
              register={register("accountNumber")}
              error={errors.accountNumber}
            />
            {type === "bank_transfer" && (
              <>
                <TextField label="Bank name" register={register("bankName")} error={errors.bankName} />
                <TextField label="IBAN" register={register("iban")} error={errors.iban} />
                <TextField label="SWIFT code" register={register("swiftCode")} error={errors.swiftCode} />
                <TextField label="Branch code" register={register("branchCode")} error={errors.branchCode} />
              </>
            )}
            <TextareaField
              label="Instructions for customers"
              register={register("instructions")}
              error={errors.instructions}
              rows={3}
            />
            <TextField
              label="Display order"
              type="number"
              step="1"
              register={register("displayOrder")}
              error={errors.displayOrder}
            />
            <SwitchField name="isActive" control={control} label="Active" description="Visible to customers at checkout" />
          </FieldGroup>
          <DialogFooter className="mt-4">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
