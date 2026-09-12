"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { signUpSchema, type SignUpInput } from "@/lib/validations/auth";
import { signUpAction } from "@/lib/auth/actions";
import { TextField, PasswordField } from "@/components/forms/text-field";
import { FieldGroup } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export function SignUpForm() {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [submitted, setSubmitted] = React.useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      fullName: "",
      username: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });

  function onSubmit(values: SignUpInput) {
    startTransition(async () => {
      const result = await signUpAction(values);
      if (!result.success) {
        toast.error(result.error);
        if (result.fieldErrors) {
          for (const [field, messages] of Object.entries(result.fieldErrors)) {
            setError(field as keyof SignUpInput, { message: messages[0] });
          }
        }
        return;
      }
      setSubmitted(true);
      toast.success("Account created — check your email to confirm it.");
    });
  }

  if (submitted) {
    return (
      <div className="space-y-4 text-center">
        <h2 className="font-heading text-xl font-semibold">Check your email</h2>
        <p className="text-sm text-muted-foreground">
          We&apos;ve sent a confirmation link to your email address. Follow it
          to activate your account, then sign in.
        </p>
        <Button variant="outline" onClick={() => router.push("/sign-in")}>
          Go to sign in
        </Button>
      </div>
    );
  }

  return (
    // method="post": if a submit fires before React hydrates, a <form>
    // with no method defaults to GET, putting the password in the URL.
    <form onSubmit={handleSubmit(onSubmit)} method="post" noValidate>
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
          label="Email"
          type="email"
          register={register("email")}
          error={errors.email}
          autoComplete="email"
        />
        <TextField
          label="Phone number"
          type="tel"
          register={register("phone")}
          error={errors.phone}
          autoComplete="tel"
        />
        <PasswordField
          label="Password"
          register={register("password")}
          error={errors.password}
          autoComplete="new-password"
        />
        <PasswordField
          label="Confirm password"
          register={register("confirmPassword")}
          error={errors.confirmPassword}
          autoComplete="new-password"
        />
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Creating account..." : "Create account"}
        </Button>
      </FieldGroup>
    </form>
  );
}
