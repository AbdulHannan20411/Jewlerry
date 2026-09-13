import { z } from "zod";
import { PAYMENT_REJECTION_REASONS } from "@/constants";

/** bigint identity PKs (everything except profile-linked uuid fields). */
const id = () => z.number().int().positive();

export const checkoutItemSchema = z.object({
  productId: id(),
  quantity: z.number().int().positive().max(999),
});

/** Just the form fields — items are computed from cart/stock state at submit time, never a tracked RHF field. */
export const checkoutDeliverySchema = z.object({
  customerName: z.string().trim().min(2, "Enter the recipient's name").max(200),
  customerPhone: z.string().trim().min(7, "Enter a valid phone number").max(20),
  customerEmail: z.email("Enter a valid email address"),
  shippingAddress: z.string().trim().min(5, "Enter a delivery address").max(500),
  shippingCity: z.string().trim().min(2, "Enter a city").max(100),
  shippingNotes: z.string().trim().max(500).optional(),
});
export type CheckoutDeliveryInput = z.infer<typeof checkoutDeliverySchema>;

export const checkoutSchema = checkoutDeliverySchema.extend({
  items: z.array(checkoutItemSchema).min(1, "Your cart is empty"),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const submitPaymentSchema = z.object({
  orderId: id(),
  paymentMethodId: id(),
  transactionReference: z.string().trim().max(200).optional(),
  note: z.string().trim().max(500).optional(),
  // The screenshot itself is validated separately (file type/size) in
  // lib/validations/products.ts's image-upload pattern, reused there.
});
export type SubmitPaymentInput = z.infer<typeof submitPaymentSchema>;

export const reviewPaymentSchema = z
  .object({
    paymentId: id(),
    decision: z.enum(["approved", "rejected"]),
    rejectionReason: z.enum(PAYMENT_REJECTION_REASONS).optional(),
    rejectionNote: z.string().trim().max(500).optional(),
  })
  .refine((data) => data.decision === "approved" || !!data.rejectionReason, {
    message: "Select a rejection reason",
    path: ["rejectionReason"],
  });
export type ReviewPaymentInput = z.infer<typeof reviewPaymentSchema>;

export const requestReturnSchema = z.object({
  orderId: id(),
  reason: z.string().trim().min(3, "Tell us why you'd like to return this order").max(500),
  notes: z.string().trim().max(1000).optional(),
});
export type RequestReturnInput = z.infer<typeof requestReturnSchema>;

export const updateOrderStatusSchema = z.object({
  orderId: id(),
  newStatus: z.enum([
    "unconfirmed",
    "payment_pending",
    "confirmed",
    "in_process",
    "delivered",
    "completed",
    "returned",
    "cancelled",
  ]),
  reason: z.string().trim().max(500).optional(),
});
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
