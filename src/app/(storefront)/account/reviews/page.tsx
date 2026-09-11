import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { ImageOff, Star } from "lucide-react";
import { requireUser } from "@/lib/permissions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCustomerReviews } from "@/lib/reviews/queries";
import { ReviewFormDialog } from "@/components/storefront/review-form-dialog";
import { DeleteReviewButton } from "@/components/storefront/delete-review-button";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "My Reviews" };

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex" role="img" aria-label={`${rating} out of 5 stars`}>
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

export default async function MyReviewsPage() {
  const profile = await requireUser();
  const supabase = await createServerSupabaseClient();
  const reviews = await getCustomerReviews(supabase, profile.id);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-semibold">My Reviews</h1>
        <p className="text-sm text-muted-foreground">
          {reviews.length} review{reviews.length === 1 ? "" : "s"}
        </p>
      </div>

      {reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          You haven&apos;t reviewed any products yet. Reviews can be added from a delivered order.
        </p>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="flex gap-3 py-4">
                <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-muted">
                  {review.productImageUrl ? (
                    <Image
                      src={review.productImageUrl}
                      alt={review.productName}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-muted-foreground">
                      <ImageOff className="size-4" />
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      {review.productSlug ? (
                        <Link
                          href={`/products/${review.productSlug}`}
                          className="text-sm font-medium text-foreground hover:underline"
                        >
                          {review.productName}
                        </Link>
                      ) : (
                        <p className="text-sm font-medium text-foreground">{review.productName}</p>
                      )}
                      <StarRow rating={review.rating} />
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDate(review.createdAt)}</span>
                  </div>
                  {review.title && <p className="text-sm font-medium text-foreground">{review.title}</p>}
                  {review.comment && <p className="text-sm text-muted-foreground">{review.comment}</p>}
                  <div className="flex gap-2 pt-1">
                    <ReviewFormDialog
                      mode="edit"
                      reviewId={review.id}
                      defaultValues={{ rating: review.rating, title: review.title, comment: review.comment }}
                    />
                    <DeleteReviewButton reviewId={review.id} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
