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
import { TextField } from "@/components/forms/text-field";
import { SwitchField } from "@/components/forms/select-field";
import { FieldGroup } from "@/components/ui/field";
import {
  categoryFormSchema,
  type CategoryFormInput,
  type CategoryFormRawInput,
} from "@/lib/validations/products";
import { createCategoryAction, updateCategoryAction } from "@/lib/products/actions";

export function CategoryFormDialog({
  mode,
  categoryId,
  defaultValues,
}: {
  mode: "create" | "edit";
  categoryId?: number;
  defaultValues?: CategoryFormInput;
}) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CategoryFormRawInput, unknown, CategoryFormInput>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: defaultValues ?? { name: "", displayOrder: 0, isActive: true },
  });

  function onSubmit(values: CategoryFormInput) {
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createCategoryAction(values)
          : await updateCategoryAction(categoryId!, values);

      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(mode === "create" ? "Category created." : "Category updated.");
      setOpen(false);
      if (mode === "create") reset({ name: "", displayOrder: 0, isActive: true });
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {mode === "create" ? (
          <Button>
            <Plus className="size-4" /> New category
          </Button>
        ) : (
          <Button variant="ghost" size="icon" aria-label="Edit category">
            <Pencil className="size-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "New category" : "Edit category"}</DialogTitle>
          <DialogDescription>Used to organize products (e.g. Rings, Necklaces).</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <TextField label="Name" register={register("name")} error={errors.name} />
            <TextField
              label="Display order"
              type="number"
              step="1"
              register={register("displayOrder")}
              error={errors.displayOrder}
            />
            <SwitchField name="isActive" control={control} label="Active" />
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
