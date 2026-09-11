"use client";

import * as React from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action-result";

/** Reused everywhere something admin-managed can be deleted (products, tags, categories, banners, reviews, FAQs, ...). */
export function ConfirmDeleteButton({
  onConfirm,
  itemLabel = "this item",
  description,
  triggerLabel,
  variant = "ghost",
  size = "icon",
}: {
  onConfirm: () => Promise<ActionResult>;
  itemLabel?: string;
  description?: string;
  triggerLabel?: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
}) {
  const [pending, startTransition] = React.useTransition();
  const [open, setOpen] = React.useState(false);

  function handleConfirm() {
    startTransition(async () => {
      const result = await onConfirm();
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Deleted.");
      setOpen(false);
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button type="button" variant={variant} size={size} aria-label={`Delete ${itemLabel}`}>
          {triggerLabel ?? <Trash2 className="size-4" />}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {itemLabel}?</AlertDialogTitle>
          <AlertDialogDescription>
            {description ?? "This action cannot be undone."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={pending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {pending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
