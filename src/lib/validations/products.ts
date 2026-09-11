import { z } from "zod";
import { MAX_IMAGE_SIZE_BYTES, ALLOWED_IMAGE_MIME_TYPES } from "@/constants";

export const productFormSchema = z
  .object({
    name: z.string().trim().min(2, "Name is required").max(200),
    description: z.string().trim().max(5000).default(""),
    categoryId: z.uuid().nullable().optional(),
    priceBeforeDiscount: z.coerce
      .number()
      .min(0, "Price must be 0 or more"),
    priceAfterDiscount: z.coerce.number().min(0, "Price must be 0 or more"),
    quantityInStock: z.coerce
      .number()
      .int("Stock must be a whole number")
      .min(0, "Stock cannot be negative"),
    isActive: z.boolean().default(true),
    tagIds: z.array(z.uuid()).default([]),
  })
  .refine((data) => data.priceAfterDiscount <= data.priceBeforeDiscount, {
    message: "Discounted price cannot exceed the original price",
    path: ["priceAfterDiscount"],
  });
// z.coerce.number() gives this schema a *narrower* output type (number)
// than its input type (unknown, since coerce accepts anything pre-parse).
// ProductFormInput is the parsed/output shape — used everywhere outside
// the form itself (Server Actions, component props). The form component
// needs the raw input shape too, for useForm's 3-generic
// input/context/output pattern — see ProductFormRawInput below.
export type ProductFormInput = z.output<typeof productFormSchema>;
export type ProductFormRawInput = z.input<typeof productFormSchema>;

export const categoryFormSchema = z.object({
  name: z.string().trim().min(2).max(100),
  displayOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
});
export type CategoryFormInput = z.output<typeof categoryFormSchema>;
export type CategoryFormRawInput = z.input<typeof categoryFormSchema>;

export const tagFormSchema = z.object({
  name: z.string().trim().min(2, "Tag name is required").max(50),
});
export type TagFormInput = z.infer<typeof tagFormSchema>;

export const productImageUploadSchema = z.object({
  file: z
    .instanceof(File)
    .refine((f) => f.size <= MAX_IMAGE_SIZE_BYTES, "Image must be 5MB or smaller")
    .refine(
      (f) => (ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(f.type),
      "Only JPEG, PNG, or WebP images are allowed",
    ),
});

export const productSortSchema = z.enum([
  "newest",
  "oldest",
  "name_asc",
  "name_desc",
  "price_asc",
  "price_desc",
  "rating",
]);
export type ProductSort = z.infer<typeof productSortSchema>;

export const productFiltersSchema = z.object({
  q: z.string().trim().max(200).optional(),
  tag: z.string().trim().max(100).optional(),
  category: z.string().trim().max(100).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  inStockOnly: z.coerce.boolean().optional(),
  newWithinDays: z.coerce.number().int().positive().optional(),
  sort: productSortSchema.default("newest"),
  page: z.coerce.number().int().min(1).default(1),
});
export type ProductFilters = z.infer<typeof productFiltersSchema>;
