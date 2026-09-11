"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { contactFormSchema, type ContactFormInput } from "@/lib/validations/admin";
import { submitContactMessageAction } from "@/lib/contact/actions";
import { TextField, TextareaField } from "@/components/forms/text-field";
import { FieldGroup } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export function ContactForm() {
  const [pending, startTransition] = React.useTransition();
  const [sent, setSent] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ContactFormInput>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: { name: "", email: "", subject: "", message: "" },
  });

  function onSubmit(values: ContactFormInput) {
    startTransition(async () => {
      const result = await submitContactMessageAction(values);
      if (!result.success) {
        toast.error(result.error);
        if (result.fieldErrors) {
          for (const [field, messages] of Object.entries(result.fieldErrors)) {
            setError(field as keyof ContactFormInput, { message: messages[0] });
          }
        }
        return;
      }
      setSent(true);
      reset();
    });
  }

  if (sent) {
    return (
      <div className="rounded-lg border border-success/30 bg-success/10 p-6 text-center">
        <p className="font-medium text-foreground">Message sent</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Thanks for reaching out — we&apos;ll get back to you soon.
        </p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => setSent(false)}>
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <TextField label="Name" register={register("name")} error={errors.name} />
        <TextField label="Email" type="email" register={register("email")} error={errors.email} />
        <TextField label="Subject" register={register("subject")} error={errors.subject} />
        <TextareaField
          label="Message"
          register={register("message")}
          error={errors.message}
          rows={5}
        />
        <Button type="submit" disabled={pending} className="w-fit">
          {pending ? "Sending..." : "Send message"}
        </Button>
      </FieldGroup>
    </form>
  );
}
