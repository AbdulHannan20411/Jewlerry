"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { TextField } from "@/components/forms/text-field";
import { SwitchField } from "@/components/forms/select-field";
import { FieldGroup } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { updateAdminSettingsAction } from "@/lib/settings/actions";
import {
  adminSettingsFormSchema,
  type AdminSettingsFormInput,
  type AdminSettingsFormRawInput,
} from "@/lib/validations/admin";

export function AdminSettingsForm({ defaultValues }: { defaultValues: AdminSettingsFormRawInput }) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<AdminSettingsFormRawInput, unknown, AdminSettingsFormInput>({
    resolver: zodResolver(adminSettingsFormSchema),
    defaultValues,
  });

  async function onSubmit(values: AdminSettingsFormInput) {
    const result = await updateAdminSettingsAction(values);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Automation settings saved.");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <FieldGroup>
        <TextField
          label="Invoice number prefix"
          register={register("invoicePrefix")}
          error={errors.invoicePrefix}
        />
        <TextField
          label="Auto-cancel unpaid orders after (hours)"
          type="number"
          step="1"
          register={register("orderAutoCancelUnconfirmedHours")}
          error={errors.orderAutoCancelUnconfirmedHours}
          description="Orders left unconfirmed with no payment submitted this long become eligible for auto-cancellation."
        />
        <SwitchField
          name="notifyAdminOnNewOrder"
          control={control}
          label="Notify admins on new orders"
        />
        <SwitchField
          name="notifyAdminOnPaymentSubmitted"
          control={control}
          label="Notify admins on payment submissions"
        />
      </FieldGroup>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Save automation settings"}
      </Button>
    </form>
  );
}
