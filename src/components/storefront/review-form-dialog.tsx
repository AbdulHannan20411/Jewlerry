"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Star, Pencil } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { submitReviewAction, updateReviewAction } from "@/lib/reviews/actions";

function StarRatingInput({ value, onChange }: { value: number; onChange: (rating: number) => void }) {
  const [hovered, setHovered] = React.useState<number | null>(null);
  const display = hovered ?? value;

  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Rating">
      {Array.from({ length: 5 }).map((_, i) => {
        const starValue = i + 1;
        return (
          <button
            key={starValue}
            type="button"
            role="radio"
            aria-checked={value === starValue}
            aria-label={`${starValue} star${starValue === 1 ? "" : "s"}`}
            onClick={() => onChange(starValue)}
            onMouseEnter={() => setHovered(starValue)}
            onMouseLeave={() => setHovered(null)}
            className="p-0.5"
          >
            <Star
              className={cn(
                "size-7",
                starValue <= display ? "fill-primary text-primary" : "text-muted-foreground/40",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

type ReviewFormDialogProps =
  | {
      mode: "create";
      productId: number;
      orderId: number;
      trigger?: React.ReactNode;
    }
  | {
      mode: "edit";
      reviewId: number;
      defaultValues: { rating: number; title: string; comment: string };
      trigger?: React.ReactNode;
    };

export function ReviewFormDialog(props: ReviewFormDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [rating, setRating] = React.useState(props.mode === "edit" ? props.defaultValues.rating : 0);
  const [title, setTitle] = React.useState(props.mode === "edit" ? props.defaultValues.title : "");
  const [comment, setComment] = React.useState(props.mode === "edit" ? props.defaultValues.comment : "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating < 1) {
      toast.error("Select a rating.");
      return;
    }
    startTransition(async () => {
      const result =
        props.mode === "create"
          ? await submitReviewAction({ productId: props.productId, orderId: props.orderId, rating, title, comment })
          : await updateReviewAction({ reviewId: props.reviewId, rating, title, comment });

      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(props.mode === "create" ? "Review submitted." : "Review updated.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {props.trigger ?? (
          <Button variant={props.mode === "create" ? "default" : "outline"} size="sm">
            {props.mode === "create" ? "Write a review" : (
              <>
                <Pencil className="size-4" /> Edit review
              </>
            )}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{props.mode === "create" ? "Write a review" : "Edit your review"}</DialogTitle>
          <DialogDescription>Share your experience with this product.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Rating</Label>
            <StarRatingInput value={rating} onChange={setRating} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="review-title">Title (optional)</Label>
            <Input id="review-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="review-comment">Comment (optional)</Label>
            <Textarea
              id="review-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={2000}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save review"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
