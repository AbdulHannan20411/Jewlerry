"use client";

import * as React from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Pencil, ImagePlus } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { TextField, TextareaField } from "@/components/forms/text-field";
import { SwitchField } from "@/components/forms/select-field";
import { FieldGroup } from "@/components/ui/field";
import { bannerFormSchema, type BannerFormInput, type BannerFormRawInput } from "@/lib/validations/admin";
import { createBannerAction, updateBannerAction } from "@/lib/banners/actions";

/** `datetime-local` inputs use "YYYY-MM-DDTHH:mm" (no timezone) — Zod's `.datetime()` needs a full ISO string. */
function toIsoOrNull(localValue: string): string | null {
  if (!localValue) return null;
  const date = new Date(localValue);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const DEFAULTS: BannerFormRawInput = {
  title: "",
  description: "",
  buttonText: "",
  buttonUrl: "",
  isActive: true,
  startDate: null,
  endDate: null,
  displayOrder: 0,
};

export function BannerFormDialog({
  mode,
  bannerId,
  defaultValues,
  currentImageUrl,
}: {
  mode: "create" | "edit";
  bannerId?: number;
  defaultValues?: BannerFormRawInput;
  currentImageUrl?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [startLocal, setStartLocal] = React.useState(isoToLocalInput(defaultValues?.startDate ?? null));
  const [endLocal, setEndLocal] = React.useState(isoToLocalInput(defaultValues?.endDate ?? null));

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<BannerFormRawInput, unknown, BannerFormInput>({
    resolver: zodResolver(bannerFormSchema),
    defaultValues: defaultValues ?? DEFAULTS,
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  function onSubmit(values: BannerFormInput) {
    if (mode === "create" && !file) {
      toast.error("Please choose a banner image.");
      return;
    }
    startTransition(async () => {
      const formData = new FormData();
      if (file) formData.set("file", file);
      const finalValues = { ...values, startDate: toIsoOrNull(startLocal), endDate: toIsoOrNull(endLocal) };

      const result =
        mode === "create"
          ? await createBannerAction(finalValues, formData)
          : await updateBannerAction(bannerId!, finalValues, formData);

      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(mode === "create" ? "Banner created." : "Banner updated.");
      setOpen(false);
      setFile(null);
      setPreview(null);
      if (mode === "create") {
        reset(DEFAULTS);
        setStartLocal("");
        setEndLocal("");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {mode === "create" ? (
          <Button>
            <Plus className="size-4" /> New banner
          </Button>
        ) : (
          <Button variant="ghost" size="icon" aria-label="Edit banner">
            <Pencil className="size-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "New banner" : "Edit banner"}</DialogTitle>
          <DialogDescription>Shown in the home page carousel.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label>Image</Label>
            {(preview || currentImageUrl) && (
              <div className="relative aspect-video w-full overflow-hidden rounded-md border border-border bg-muted">
                <Image src={preview ?? currentImageUrl!} alt="Banner preview" fill className="object-cover" />
              </div>
            )}
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ImagePlus className="size-4" />
              {mode === "create" ? "Choose image" : "Replace image (optional)"}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} className="hidden" />
            </label>
          </div>

          <FieldGroup>
            <TextField label="Title" register={register("title")} error={errors.title} />
            <TextareaField label="Description" register={register("description")} error={errors.description} rows={2} />
            <TextField label="Button text" register={register("buttonText")} error={errors.buttonText} />
            <TextField label="Button URL" register={register("buttonUrl")} error={errors.buttonUrl} />
            <TextField
              label="Display order"
              type="number"
              step="1"
              register={register("displayOrder")}
              error={errors.displayOrder}
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="banner-start">Start (optional)</Label>
                <input
                  id="banner-start"
                  type="datetime-local"
                  value={startLocal}
                  onChange={(e) => setStartLocal(e.target.value)}
                  className="border-input h-8 w-full rounded-lg border bg-transparent px-2.5 text-sm outline-none"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="banner-end">End (optional)</Label>
                <input
                  id="banner-end"
                  type="datetime-local"
                  value={endLocal}
                  onChange={(e) => setEndLocal(e.target.value)}
                  className="border-input h-8 w-full rounded-lg border bg-transparent px-2.5 text-sm outline-none"
                />
              </div>
            </div>
            <SwitchField name="isActive" control={control} label="Active" />
          </FieldGroup>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
