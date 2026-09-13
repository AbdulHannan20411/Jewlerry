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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  getReturnProofUrlsAction,
  reviewReturnRequestAction,
  markReturnReceivedAction,
} from "@/lib/returns/actions";
import type { ReturnRequestDetail } from "@/lib/returns/queries";
import type { OrderStatusValue } from "@/types/database";

export function ReturnReviewPanel({
  request,
  orderStatus,
}: {
  request: ReturnRequestDetail;
  orderStatus: OrderStatusValue;
}) {
  const router = useRouter();
  const [photoUrls, setPhotoUrls] = React.useState<string[] | null>(null);
  const [loadingPhotos, setLoadingPhotos] = React.useState(true);
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [adminReason, setAdminReason] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    let cancelled = false;
    getReturnProofUrlsAction(request.id).then((result) => {
      if (cancelled) return;
      setLoadingPhotos(false);
      if (result.success) setPhotoUrls(result.data.urls);
    });
    return () => {
      cancelled = true;
    };
  }, [request.id]);

  function handleApprove() {
    startTransition(async () => {
      const result = await reviewReturnRequestAction({ requestId: request.id, decision: "approved" });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Return request approved.");
      router.refresh();
    });
  }

  function handleReject() {
    if (adminReason.trim().length === 0) {
      toast.error("Give a reason for rejecting this return.");
      return;
    }
    startTransition(async () => {
      const result = await reviewReturnRequestAction({
        requestId: request.id,
        decision: "rejected",
        adminReason,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Return request rejected.");
      setRejectOpen(false);
      router.refresh();
    });
  }

  function handleMarkReceived() {
    startTransition(async () => {
      const result = await markReturnReceivedAction(request.orderId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Order marked as returned.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {loadingPhotos ? (
          <div className="col-span-full flex aspect-[4/3] items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : photoUrls && photoUrls.length > 0 ? (
          photoUrls.map((url, i) => (
            <div key={url} className="relative aspect-square overflow-hidden rounded-md border border-border bg-muted">
              <Image src={url} alt={`Return proof ${i + 1}`} fill sizes="200px" className="object-cover" />
            </div>
          ))
        ) : (
          <div className="col-span-full flex aspect-[4/3] flex-col items-center justify-center gap-1 rounded-md border border-border bg-muted text-muted-foreground">
            <ImageOff className="size-6" />
            <p className="text-xs">Could not load photos</p>
          </div>
        )}
      </div>

      {request.status === "rejected" && request.adminDecisionReason && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">
          <p className="font-medium text-destructive">Rejected: {request.adminDecisionReason}</p>
        </div>
      )}

      {request.status === "approved" && (
        <div className="rounded-md border border-success/30 bg-success/10 p-3 text-sm text-foreground">
          {request.receivedAt
            ? "The parcel has been received and this order is marked returned."
            : "Approved — waiting for the customer to ship the item(s) back."}
        </div>
      )}

      {request.status === "pending" && (
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

      {request.status === "approved" && !request.receivedAt && orderStatus === "return_processing" && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button disabled={pending} className="w-full">
              Mark as returned
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm the parcel was received?</AlertDialogTitle>
              <AlertDialogDescription>
                This marks the order as fully returned and notifies the customer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={pending}>Not yet</AlertDialogCancel>
              <AlertDialogAction onClick={handleMarkReceived} disabled={pending}>
                {pending ? "Working..." : "Mark as returned"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject this return request?</DialogTitle>
            <DialogDescription>The customer will see this reason, and the order stays as it was.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="return-rejection-reason">Reason</Label>
            <Textarea
              id="return-rejection-reason"
              value={adminReason}
              onChange={(e) => setAdminReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              onClick={handleReject}
              disabled={pending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {pending ? "Rejecting..." : "Reject request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
