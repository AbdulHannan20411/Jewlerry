"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { signInSchema, type SignInInput } from "@/lib/validations/auth";
import { signInAction } from "@/lib/auth/actions";
import { TextField, PasswordField } from "@/components/forms/text-field";
import { FieldGroup } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export function SignInForm({ returnTo }: { returnTo?: string }) {
  const [pending, startTransition] = React.useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { identifier: "", password: "" },
  });

  function onSubmit(values: SignInInput) {
    startTransition(async () => {
      const result = await signInAction(values);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      // Full navigation (not router.push) so every server component along
      // the target path re-reads the freshly-set session cookie.
      const target =
        returnTo && returnTo.startsWith("/") ? returnTo : result.data.defaultRedirect;
      window.location.assign(target);
    });
  }

  return (
    // method="post" is a defense-in-depth fallback: if a submit fires
    // before React has hydrated and attached onSubmit (slow network/
    // device — real, not hypothetical, on a first mobile load), a plain
    // <form> with no method defaults to GET, serializing the password
    // into the URL — visible in browser history and server access logs.
    <form onSubmit={handleSubmit(onSubmit)} method="post" noValidate>
      <FieldGroup>
        <TextField
          label="Username or email"
          register={register("identifier")}
          error={errors.identifier}
          autoComplete="username"
        />
        <PasswordField
          label="Password"
          register={register("password")}
          error={errors.password}
          autoComplete="current-password"
        />
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Signing in..." : "Sign in"}
        </Button>
      </FieldGroup>
    </form>
  );
}
