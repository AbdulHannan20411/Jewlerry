"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  productFormSchema,
  type ProductFormInput,
  type ProductFormRawInput,
} from "@/lib/validations/products";
import { createProductAction, updateProductAction } from "@/lib/products/actions";
import { TextField, TextareaField } from "@/components/forms/text-field";
import { SelectField, SwitchField } from "@/components/forms/select-field";
import { TagMultiSelect } from "@/components/forms/tag-multi-select";
import { FieldGroup, FieldSeparator } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export function ProductForm({
  mode,
  productId,
  defaultValues,
  categories,
  tags,
}: {
  mode: "create" | "edit";
  productId?: number;
  defaultValues: ProductFormInput;
  categories: { id: number; name: string }[];
  tags: { id: number; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  // Three generics because productFormSchema uses z.coerce.number(): the
  // form's raw field values (input, pre-coercion) differ from what the
  // resolver hands to onSubmit (output, post-coercion) — see
  // ProductFormRawInput's doc comment in lib/validations/products.ts.
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<ProductFormRawInput, unknown, ProductFormInput>({
    resolver: zodResolver(productFormSchema),
    defaultValues,
  });

  function reportErrors(result: { success: false; error: string; fieldErrors?: Record<string, string[]> }) {
    toast.error(result.error);
    if (result.fieldErrors) {
      for (const [field, messages] of Object.entries(result.fieldErrors)) {
        setError(field as keyof ProductFormRawInput, { message: messages[0] });
      }
    }
  }

  function onSubmit(values: ProductFormInput) {
    startTransition(async () => {
      if (mode === "create") {
        const result = await createProductAction(values);
        if (!result.success) return reportErrors(result);
        toast.success("Product created.");
        router.push(`/admin/products/${result.data.id}`);
        return;
      }

      const result = await updateProductAction(productId!, values);
      if (!result.success) return reportErrors(result);
      toast.success("Product updated.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <TextField label="Product name" register={register("name")} error={errors.name} />
        <TextareaField
          label="Description"
          register={register("description")}
          error={errors.description}
          rows={5}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label="Price before discount"
            type="number"
            step="0.01"
            min="0"
            register={register("priceBeforeDiscount")}
            error={errors.priceBeforeDiscount}
          />
          <TextField
            label="Price after discount"
            type="number"
            step="0.01"
            min="0"
            register={register("priceAfterDiscount")}
            error={errors.priceAfterDiscount}
            description="Equal to the price above if there's no discount."
          />
        </div>

        <TextField
          label="Quantity in stock"
          type="number"
          min="0"
          step="1"
          register={register("quantityInStock")}
          error={errors.quantityInStock}
        />

        <SelectField
          name="categoryId"
          control={control}
          label="Category"
          options={categories.map((c) => ({ value: String(c.id), label: c.name }))}
          allowEmpty
          emptyLabel="No category"
        />

        <TagMultiSelect
          name="tagIds"
          control={control}
          label="Tags"
          options={tags.map((t) => ({ id: t.id, name: t.name }))}
        />

        <FieldSeparator />

        <SwitchField
          name="isActive"
          control={control}
          label="Active"
          description="Inactive products are hidden from the storefront."
        />

        <Button type="submit" disabled={pending} className="w-fit">
          {pending ? "Saving..." : mode === "create" ? "Create product" : "Save changes"}
        </Button>
      </FieldGroup>
    </form>
  );
}
