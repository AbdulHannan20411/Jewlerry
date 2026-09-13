"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cancelOrderAction } from "@/lib/orders/actions";
import { requestReturnAction } from "@/lib/returns/actions";
import { MAX_RETURN_PROOF_IMAGES } from "@/constants";

export function CancelOrderButton({ orderId }: { orderId: number }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await cancelOrderAction(orderId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Order cancelled.");
      router.refresh();
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline">Cancel order</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel this order?</AlertDialogTitle>
          <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Keep order</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={pending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {pending ? "Cancelling..." : "Cancel order"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function RequestReturnButton({ orderId }: { orderId: number }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [files, setFiles] = React.useState<File[]>([]);
  const [pending, startTransition] = React.useTransition();

  function handleFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []).slice(0, MAX_RETURN_PROOF_IMAGES);
    setFiles(selected);
  }

  const canSubmit = title.trim().length >= 3 && reason.trim().length >= 10 && files.length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    startTransition(async () => {
      const formData = new FormData();
      for (const file of files) formData.append("files", file);
      const result = await requestReturnAction({ orderId, title, reason }, formData);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Return request submitted.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Request return</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request a return</DialogTitle>
          <DialogDescription>
            Tell us why you&apos;d like to return this order and attach photos as proof. An admin will review
            your request.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="return-title">Title</Label>
            <Input
              id="return-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Item arrived damaged"
              required
              minLength={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="return-reason">Reason</Label>
            <Textarea
              id="return-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              minLength={10}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="return-photos">Proof photos</Label>
            <Input
              id="return-photos"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleFilesChange}
            />
            <p className="text-xs text-muted-foreground">
              {files.length > 0
                ? `${files.length} photo${files.length === 1 ? "" : "s"} selected`
                : `JPEG, PNG, or WebP. Up to ${MAX_RETURN_PROOF_IMAGES} photos, 5MB each.`}
            </p>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending || !canSubmit}>
              {pending ? "Submitting..." : "Submit request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
