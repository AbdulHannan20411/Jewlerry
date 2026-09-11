"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validations/auth";
import { resetPasswordAction } from "@/lib/auth/actions";
import { PasswordField } from "@/components/forms/text-field";
import { FieldGroup } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export function ResetPasswordForm() {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  function onSubmit(values: ResetPasswordInput) {
    startTransition(async () => {
      const result = await resetPasswordAction(values);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Password updated. You're signed in.");
      router.push("/account");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <PasswordField
          label="New password"
          register={register("password")}
          error={errors.password}
          autoComplete="new-password"
        />
        <PasswordField
          label="Confirm new password"
          register={register("confirmPassword")}
          error={errors.confirmPassword}
          autoComplete="new-password"
        />
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Updating..." : "Update password"}
        </Button>
      </FieldGroup>
    </form>
  );
}
