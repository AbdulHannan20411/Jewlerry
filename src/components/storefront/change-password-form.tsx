"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { changePasswordSchema, type ChangePasswordInput } from "@/lib/validations/auth";
import { changePasswordAction } from "@/lib/auth/actions";
import { PasswordField } from "@/components/forms/text-field";
import { FieldGroup } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export function ChangePasswordForm({
  onSuccess,
  redirectTo,
}: {
  onSuccess?: () => void;
  /** Navigated to after a successful change (used by the forced first-login flow). */
  redirectTo?: Route;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  function onSubmit(values: ChangePasswordInput) {
    startTransition(async () => {
      const result = await changePasswordAction(values);
      if (!result.success) {
        toast.error(result.error);
        if (result.fieldErrors) {
          for (const [field, messages] of Object.entries(result.fieldErrors)) {
            setError(field as keyof ChangePasswordInput, { message: messages[0] });
          }
        }
        return;
      }
      toast.success("Password updated.");
      reset();
      onSuccess?.();
      if (redirectTo) {
        router.push(redirectTo);
        router.refresh();
      }
    });
  }

  return (
    // method="post": if a submit fires before React hydrates, a <form>
    // with no method defaults to GET, putting the password in the URL.
    <form onSubmit={handleSubmit(onSubmit)} method="post" noValidate>
      <FieldGroup>
        <PasswordField
          label="Current password"
          register={register("currentPassword")}
          error={errors.currentPassword}
          autoComplete="current-password"
        />
        <PasswordField
          label="New password"
          register={register("newPassword")}
          error={errors.newPassword}
          autoComplete="new-password"
        />
        <PasswordField
          label="Confirm new password"
          register={register("confirmPassword")}
          error={errors.confirmPassword}
          autoComplete="new-password"
        />
        <Button type="submit" disabled={pending} className="w-fit">
          {pending ? "Updating..." : "Update password"}
        </Button>
      </FieldGroup>
    </form>
  );
}
