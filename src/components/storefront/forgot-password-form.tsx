"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validations/auth";
import { forgotPasswordAction } from "@/lib/auth/actions";
import { TextField } from "@/components/forms/text-field";
import { FieldGroup } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export function ForgotPasswordForm() {
  const [pending, startTransition] = React.useTransition();
  const [submitted, setSubmitted] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  function onSubmit(values: ForgotPasswordInput) {
    startTransition(async () => {
      await forgotPasswordAction(values);
      // Always show the same generic confirmation — never reveal whether
      // the email exists.
      setSubmitted(true);
    });
  }

  if (submitted) {
    return (
      <p className="text-sm text-muted-foreground">
        If an account exists for this email, a password reset link has been sent.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <TextField
          label="Email"
          type="email"
          register={register("email")}
          error={errors.email}
          autoComplete="email"
        />
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Sending..." : "Send reset link"}
        </Button>
      </FieldGroup>
    </form>
  );
}
