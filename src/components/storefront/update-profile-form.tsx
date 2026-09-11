"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { updateProfileSchema, type UpdateProfileInput } from "@/lib/validations/auth";
import { updateProfileAction } from "@/lib/auth/actions";
import { TextField } from "@/components/forms/text-field";
import { FieldGroup } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export function UpdateProfileForm({
  defaultValues,
}: {
  defaultValues: UpdateProfileInput;
}) {
  const [pending, startTransition] = React.useTransition();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues,
  });

  function onSubmit(values: UpdateProfileInput) {
    startTransition(async () => {
      const result = await updateProfileAction(values);
      if (!result.success) {
        toast.error(result.error);
        if (result.fieldErrors) {
          for (const [field, messages] of Object.entries(result.fieldErrors)) {
            setError(field as keyof UpdateProfileInput, { message: messages[0] });
          }
        }
        return;
      }
      toast.success("Profile updated.");
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <TextField
          label="Full name"
          register={register("fullName")}
          error={errors.fullName}
          autoComplete="name"
        />
        <TextField
          label="Username"
          register={register("username")}
          error={errors.username}
          autoComplete="username"
        />
        <TextField
          label="Phone number"
          type="tel"
          register={register("phone")}
          error={errors.phone}
          autoComplete="tel"
        />
        <Button type="submit" disabled={pending || !isDirty} className="w-fit">
          {pending ? "Saving..." : "Save changes"}
        </Button>
      </FieldGroup>
    </form>
  );
}
