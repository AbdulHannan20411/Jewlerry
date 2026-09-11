"use client";

import * as React from "react";
import type {
  UseFormRegisterReturn,
  FieldError,
  FieldErrorsImpl,
  Merge,
} from "react-hook-form";
import { Field, FieldLabel, FieldError as FieldErrorDisplay } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// RHF's error type for a given field widens to this Merge<> shape whenever
// the overall schema has a top-level .refine()/.superRefine() (common for
// this app's forms — see e.g. productFormSchema's cross-field discount
// check). Both shapes carry a `.message`, which is all these components
// actually read.
type FieldErrorLike = FieldError | Merge<FieldError, FieldErrorsImpl<Record<string, unknown>>>;

type BaseProps = {
  label: string;
  register: UseFormRegisterReturn;
  error?: FieldErrorLike;
  description?: string;
  className?: string;
};

export function TextField({
  label,
  register,
  error,
  description,
  className,
  ...inputProps
}: BaseProps & Omit<React.ComponentProps<typeof Input>, "name">) {
  return (
    <Field data-invalid={!!error} className={className}>
      <FieldLabel htmlFor={register.name}>{label}</FieldLabel>
      <Input
        id={register.name}
        aria-invalid={!!error}
        aria-describedby={error ? `${register.name}-error` : undefined}
        {...register}
        {...inputProps}
      />
      {description && !error ? (
        <p className="text-sm text-muted-foreground">{description}</p>
      ) : null}
      <FieldErrorDisplay id={`${register.name}-error`} errors={error ? [error] : undefined} />
    </Field>
  );
}

export function TextareaField({
  label,
  register,
  error,
  description,
  className,
  ...textareaProps
}: BaseProps & Omit<React.ComponentProps<typeof Textarea>, "name">) {
  return (
    <Field data-invalid={!!error} className={className}>
      <FieldLabel htmlFor={register.name}>{label}</FieldLabel>
      <Textarea
        id={register.name}
        aria-invalid={!!error}
        aria-describedby={error ? `${register.name}-error` : undefined}
        {...register}
        {...textareaProps}
      />
      {description && !error ? (
        <p className="text-sm text-muted-foreground">{description}</p>
      ) : null}
      <FieldErrorDisplay id={`${register.name}-error`} errors={error ? [error] : undefined} />
    </Field>
  );
}

export function PasswordField({
  label,
  register,
  error,
  description,
  className,
  ...inputProps
}: BaseProps & Omit<React.ComponentProps<typeof Input>, "name" | "type">) {
  const [visible, setVisible] = React.useState(false);

  return (
    <Field data-invalid={!!error} className={className}>
      <FieldLabel htmlFor={register.name}>{label}</FieldLabel>
      <div className="relative">
        <Input
          id={register.name}
          type={visible ? "text" : "password"}
          aria-invalid={!!error}
          aria-describedby={error ? `${register.name}-error` : undefined}
          className="pr-10"
          {...register}
          {...inputProps}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-sm text-muted-foreground hover:text-foreground"
          aria-label={visible ? "Hide password" : "Show password"}
          tabIndex={-1}
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
      {description && !error ? (
        <p className="text-sm text-muted-foreground">{description}</p>
      ) : null}
      <FieldErrorDisplay id={`${register.name}-error`} errors={error ? [error] : undefined} />
    </Field>
  );
}
