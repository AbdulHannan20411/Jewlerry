"use client";

import type {
  Control,
  FieldError,
  FieldErrorsImpl,
  FieldPath,
  FieldValues,
  Merge,
} from "react-hook-form";
import { Controller } from "react-hook-form";
import { Field, FieldLabel, FieldError as FieldErrorDisplay } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

// See text-field.tsx for why this is broader than plain FieldError.
type FieldErrorLike = FieldError | Merge<FieldError, FieldErrorsImpl<Record<string, unknown>>>;

export function SelectField<TFieldValues extends FieldValues>({
  name,
  control,
  label,
  error,
  options,
  placeholder = "Select...",
  allowEmpty,
  emptyLabel = "None",
}: {
  name: FieldPath<TFieldValues>;
  control: Control<TFieldValues>;
  label: string;
  error?: FieldErrorLike;
  options: { value: string; label: string }[];
  placeholder?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
}) {
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Select
            value={field.value ? String(field.value) : ""}
            onValueChange={(v) => field.onChange(v === "__none__" ? null : v)}
          >
            <SelectTrigger id={name} aria-invalid={!!error} className="w-full">
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {allowEmpty && <SelectItem value="__none__">{emptyLabel}</SelectItem>}
              {options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      <FieldErrorDisplay errors={error ? [error] : undefined} />
    </Field>
  );
}

export function SwitchField<TFieldValues extends FieldValues>({
  name,
  control,
  label,
  description,
}: {
  name: FieldPath<TFieldValues>;
  control: Control<TFieldValues>;
  label: string;
  description?: string;
}) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <Field orientation="horizontal" className="justify-between">
          <div className="space-y-0.5">
            <FieldLabel htmlFor={name}>{label}</FieldLabel>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          <Switch id={name} checked={!!field.value} onCheckedChange={field.onChange} />
        </Field>
      )}
    />
  );
}
