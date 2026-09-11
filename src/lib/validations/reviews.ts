import { z } from "zod";

const id = () => z.number().int().positive();

export const reviewFormSchema = z.object({
  productId: id(),
  orderId: id(),
  rating: z.number().int().min(1, "Select a rating").max(5),
  title: z.string().trim().max(150).default(""),
  comment: z.string().trim().max(2000).default(""),
});
export type ReviewFormInput = z.infer<typeof reviewFormSchema>;

export const updateReviewSchema = z.object({
  reviewId: id(),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(150).default(""),
  comment: z.string().trim().max(2000).default(""),
});
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;
