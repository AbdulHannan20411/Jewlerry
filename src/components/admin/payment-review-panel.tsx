"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ImageOff, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getPaymentScreenshotUrlAction, reviewPaymentAction } from "@/lib/payments/actions";
import { PAYMENT_REJECTION_REASONS } from "@/constants";
import type { PaymentDetail } from "@/lib/payments/queries";

export function PaymentReviewPanel({ payment }: { payment: PaymentDetail }) {
  const router = useRouter();
  const [screenshotUrl, setScreenshotUrl] = React.useState<string | null>(null);
  const [loadingScreenshot, setLoadingScreenshot] = React.useState(true);
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [rejectionReason, setRejectionReason] = React.useState<string>("");
  const [rejectionNote, setRejectionNote] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    let cancelled = false;
    getPaymentScreenshotUrlAction(payment.id).then((result) => {
      if (cancelled) return;
      setLoadingScreenshot(false);
      if (result.success) setScreenshotUrl(result.data.url);
    });
    return () => {
      cancelled = true;
    };
  }, [payment.id]);

  function handleApprove() {
    startTransition(async () => {
      const result = await reviewPaymentAction({ paymentId: payment.id, decision: "approved" });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Payment approved.");
      router.refresh();
    });
  }

  function handleReject() {
    if (!rejectionReason) {
      toast.error("Select a rejection reason.");
      return;
    }
    startTransition(async () => {
      const result = await reviewPaymentAction({
        paymentId: payment.id,
        decision: "rejected",
        rejectionReason: rejectionReason as (typeof PAYMENT_REJECTION_REASONS)[number],
        rejectionNote: rejectionNote || undefined,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Payment rejected.");
      setRejectOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md border border-border bg-muted">
        {loadingScreenshot ? (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : screenshotUrl ? (
          <Image src={screenshotUrl} alt="Payment screenshot" fill sizes="480px" className="object-contain" />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-1 text-muted-foreground">
            <ImageOff className="size-6" />
            <p className="text-xs">Could not load screenshot</p>
          </div>
        )}
      </div>

      {payment.status === "rejected" && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">
          <p className="font-medium text-destructive">Rejected: {payment.rejectionReason}</p>
          {payment.rejectionNote && <p className="mt-1 text-muted-foreground">{payment.rejectionNote}</p>}
        </div>
      )}

      {payment.status === "pending" && (
        <div className="flex gap-2">
          <Button onClick={handleApprove} disabled={pending} className="flex-1">
            {pending ? "Working..." : "Approve"}
          </Button>
          <Button
            onClick={() => setRejectOpen(true)}
            disabled={pending}
            variant="outline"
            className="flex-1 border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            Reject
          </Button>
        </div>
      )}

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject this payment?</DialogTitle>
            <DialogDescription>
              The customer will see this reason and can submit a new payment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Reason</Label>
              <Select value={rejectionReason} onValueChange={setRejectionReason}>
                <SelectTrigger id="rejection-reason" className="w-full">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_REJECTION_REASONS.map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {reason}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rejection-note">Additional note (optional)</Label>
              <Textarea
                id="rejection-note"
                value={rejectionNote}
                onChange={(e) => setRejectionNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleReject}
              disabled={pending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {pending ? "Rejecting..." : "Reject payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
