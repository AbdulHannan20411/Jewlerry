import { z } from "zod";

export const paymentMethodFormSchema = z.object({
  type: z.enum(["mobile_wallet", "bank_transfer", "other"]),
  name: z.string().trim().min(2).max(100),
  accountHolderName: z.string().trim().max(150).optional(),
  accountNumber: z.string().trim().max(50).optional(),
  iban: z.string().trim().max(50).optional(),
  bankName: z.string().trim().max(150).optional(),
  instructions: z.string().trim().max(1000).optional(),
  isActive: z.boolean().default(true),
  displayOrder: z.coerce.number().int().default(0),
  swiftCode: z.string().trim().max(20).optional(),
  branchCode: z.string().trim().max(20).optional(),
});
export type PaymentMethodFormInput = z.output<typeof paymentMethodFormSchema>;
export type PaymentMethodFormRawInput = z.input<typeof paymentMethodFormSchema>;

export const bannerFormSchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(500).optional(),
  buttonText: z.string().trim().max(50).optional(),
  buttonUrl: z.string().trim().max(300).optional(),
  isActive: z.boolean().default(true),
  startDate: z.string().datetime().nullable().optional(),
  endDate: z.string().datetime().nullable().optional(),
  displayOrder: z.coerce.number().int().default(0),
});
export type BannerFormInput = z.infer<typeof bannerFormSchema>;

export const faqFormSchema = z.object({
  question: z.string().trim().min(3).max(300),
  answer: z.string().trim().min(3).max(2000),
  isActive: z.boolean().default(true),
  displayOrder: z.coerce.number().int().default(0),
});
export type FaqFormInput = z.infer<typeof faqFormSchema>;

export const contactFormSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(150),
  email: z.email("Enter a valid email address"),
  subject: z.string().trim().max(200).optional(),
  message: z.string().trim().min(5, "Enter a message").max(2000),
});
export type ContactFormInput = z.infer<typeof contactFormSchema>;

export const siteSettingsFormSchema = z.object({
  storeName: z.string().trim().min(2).max(150),
  storeEmail: z.email().optional().or(z.literal("")),
  storePhone: z.string().trim().max(30).optional(),
  whatsappNumber: z.string().trim().max(30).optional(),
  address: z.string().trim().max(500).optional(),
  businessHours: z.string().trim().max(500).optional(),
  lowStockThreshold: z.coerce.number().int().min(0),
  shippingCost: z.coerce.number().min(0),
  currencyCode: z.string().trim().length(3),
  darkModeEnabled: z.boolean(),
});
export type SiteSettingsFormInput = z.infer<typeof siteSettingsFormSchema>;

export const sendNotificationSchema = z.object({
  recipientType: z.enum(["single", "selected", "all"]),
  recipientIds: z.array(z.uuid()).default([]),
  title: z.string().trim().min(2).max(150),
  message: z.string().trim().min(2).max(1000),
  type: z.enum(["order", "payment", "announcement", "promotion", "system"]).default("announcement"),
});
export type SendNotificationInput = z.infer<typeof sendNotificationSchema>;

export const blockCustomerSchema = z.object({
  customerId: z.uuid(),
  reason: z.string().trim().min(3, "Give a reason for blocking this customer").max(500),
});
export type BlockCustomerInput = z.infer<typeof blockCustomerSchema>;
