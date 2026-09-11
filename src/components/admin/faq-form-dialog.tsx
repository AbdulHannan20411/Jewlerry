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
import { SwitchField } from "@/components/forms/select-field";
import { FieldGroup } from "@/components/ui/field";
import { faqFormSchema, type FaqFormInput, type FaqFormRawInput } from "@/lib/validations/admin";
import { createFaqAction, updateFaqAction } from "@/lib/faqs/actions";

const DEFAULTS: FaqFormRawInput = { question: "", answer: "", isActive: true, displayOrder: 0 };

export function FaqFormDialog({
  mode,
  faqId,
  defaultValues,
}: {
  mode: "create" | "edit";
  faqId?: number;
  defaultValues?: FaqFormRawInput;
}) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FaqFormRawInput, unknown, FaqFormInput>({
    resolver: zodResolver(faqFormSchema),
    defaultValues: defaultValues ?? DEFAULTS,
  });

  function onSubmit(values: FaqFormInput) {
    startTransition(async () => {
      const result = mode === "create" ? await createFaqAction(values) : await updateFaqAction(faqId!, values);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(mode === "create" ? "FAQ created." : "FAQ updated.");
      setOpen(false);
      if (mode === "create") reset(DEFAULTS);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {mode === "create" ? (
          <Button>
            <Plus className="size-4" /> New FAQ
          </Button>
        ) : (
          <Button variant="ghost" size="icon" aria-label="Edit FAQ">
            <Pencil className="size-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "New FAQ" : "Edit FAQ"}</DialogTitle>
          <DialogDescription>Shown on the public FAQ page.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <TextField label="Question" register={register("question")} error={errors.question} />
            <TextareaField label="Answer" register={register("answer")} error={errors.answer} rows={4} />
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
