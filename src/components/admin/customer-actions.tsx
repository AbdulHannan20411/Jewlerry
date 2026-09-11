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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { blockCustomerAction, unblockCustomerAction, adminDeleteCustomerAction } from "@/lib/customers/actions";

export function BlockCustomerButton({ customerId }: { customerId: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await blockCustomerAction({ customerId, reason });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Customer blocked.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive">
          Block customer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Block this customer?</DialogTitle>
          <DialogDescription>They&apos;ll be signed out and unable to sign in until unblocked.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="block-reason">Reason</Label>
            <Textarea id="block-reason" value={reason} onChange={(e) => setReason(e.target.value)} required minLength={3} rows={3} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending || reason.trim().length < 3} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {pending ? "Blocking..." : "Block customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function UnblockCustomerButton({ customerId }: { customerId: string }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await unblockCustomerAction(customerId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Customer unblocked.");
      router.refresh();
    });
  }

  return (
    <Button variant="outline" onClick={handleClick} disabled={pending}>
      {pending ? "Unblocking..." : "Unblock customer"}
    </Button>
  );
}

export function DeleteCustomerButton({ customerId }: { customerId: string }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await adminDeleteCustomerAction(customerId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Customer deleted.");
      router.push("/admin/customers");
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Delete customer</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this customer?</AlertDialogTitle>
          <AlertDialogDescription>
            Their profile is anonymized and their account is disabled. Existing orders/reviews are kept
            (never removed) but no longer show their real name. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={pending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {pending ? "Deleting..." : "Delete customer"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
