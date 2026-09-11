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
import { FieldGroup } from "@/components/ui/field";
import { tagFormSchema, type TagFormInput } from "@/lib/validations/products";
import { createTagAction, updateTagAction } from "@/lib/products/actions";

export function TagFormDialog({
  mode,
  tagId,
  defaultValues,
}: {
  mode: "create" | "edit";
  tagId?: number;
  defaultValues?: TagFormInput;
}) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TagFormInput>({
    resolver: zodResolver(tagFormSchema),
    defaultValues: defaultValues ?? { name: "" },
  });

  function onSubmit(values: TagFormInput) {
    startTransition(async () => {
      const result =
        mode === "create" ? await createTagAction(values) : await updateTagAction(tagId!, values);

      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(mode === "create" ? "Tag created." : "Tag updated.");
      setOpen(false);
      if (mode === "create") reset({ name: "" });
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {mode === "create" ? (
          <Button>
            <Plus className="size-4" /> New tag
          </Button>
        ) : (
          <Button variant="ghost" size="icon" aria-label="Edit tag">
            <Pencil className="size-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "New tag" : "Edit tag"}</DialogTitle>
          <DialogDescription>
            Tags help customers filter products (e.g. Sale, New, Featured).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <TextField label="Name" register={register("name")} error={errors.name} />
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
