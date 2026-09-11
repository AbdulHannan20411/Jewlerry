import { Star } from "lucide-react";
import { formatDate, cn } from "@/lib/utils";
import type { ProductReview } from "@/lib/reviews/queries";

function StarRow({ rating, className }: { rating: number; className?: string }) {
  return (
    <div className={cn("flex", className)} role="img" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          aria-hidden="true"
          className={cn("size-4", i < rating ? "fill-primary text-primary" : "text-muted-foreground/40")}
        />
      ))}
    </div>
  );
}

export function ReviewSummary({
  averageRating,
  reviewCount,
}: {
  averageRating: number;
  reviewCount: number;
}) {
  if (reviewCount === 0) {
    return <p className="text-sm text-muted-foreground">No reviews yet.</p>;
  }
  return (
    <div className="flex items-center gap-2">
      <StarRow rating={Math.round(averageRating)} />
      <span className="text-sm font-medium text-foreground">{averageRating.toFixed(1)}</span>
      <span className="text-sm text-muted-foreground">
        ({reviewCount} review{reviewCount === 1 ? "" : "s"})
      </span>
    </div>
  );
}

export function ReviewList({ reviews }: { reviews: ProductReview[] }) {
  if (reviews.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Be the first to review this product after your order is delivered.
      </p>
    );
  }

  return (
    <ul className="space-y-6">
      {reviews.map((review) => (
        <li key={review.id} className="border-b border-border/70 pb-6 last:border-0 last:pb-0">
          <div className="flex items-center justify-between gap-2">
            <StarRow rating={review.rating} />
            <span className="text-xs text-muted-foreground">{formatDate(review.createdAt)}</span>
          </div>
          {review.title && (
            <p className="mt-2 text-sm font-medium text-foreground">{review.title}</p>
          )}
          {review.comment && (
            <p className="mt-1 text-sm text-muted-foreground">{review.comment}</p>
          )}
          <p className="mt-2 text-xs font-medium text-foreground/70">{review.customerName}</p>
        </li>
      ))}
    </ul>
  );
}
