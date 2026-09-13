import { z } from "zod";

/**
 * Shared client+server validation for every auth flow. Imported by both
 * the React Hook Form resolvers (client) and the Server Actions (server) —
 * per spec, neither side may trust the other's validation alone.
 */

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[a-z]/, "Password must include a lowercase letter")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/[0-9]/, "Password must include a number");

const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be at most 30 characters")
  .regex(
    /^[a-zA-Z][a-zA-Z0-9_.]*$/,
    "Username must start with a letter, and can only contain letters, numbers, underscores and periods",
  )
  .regex(/^(?!.*[_.]{2})/, "Username can't have consecutive underscores or periods")
  .regex(/[a-zA-Z0-9]$/, "Username can't end with an underscore or period");

// Trim/lowercase BEFORE the email-format check, not after — chained onto
// z.email() directly, .trim()/.toLowerCase() would run after the format
// check, rejecting a merely space-padded address before ever trimming it.
// RFC 5321 caps a full email address at 254 characters; z.email() already
// validates shape (local@domain.tld), the final .max() just guards
// against an absurdly long string slipping through as "technically valid".
const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address"))
  .pipe(z.string().max(254, "Email is too long"));

// E.164-ish: optional leading +, 8-15 digits total. Deliberately permissive
// about *country* formatting (a leading 0, spaces, dashes, dots, and
// parentheses are all stripped before validation) rather than enforcing
// one country's local format, since this store isn't limited to one.
const phoneSchema = z
  .string()
  .transform((v) => v.replace(/[\s().-]/g, ""))
  .pipe(z.string().regex(/^\+?[0-9]{8,15}$/, "Enter a valid phone number (8-15 digits)"));

export const signUpSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Enter your full name")
      .max(100)
      .regex(/^[a-zA-Z\s'.-]+$/, "Full name can only contain letters, spaces, and ' . -"),
    username: usernameSchema,
    email: emailSchema,
    phone: phoneSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  // Accepts either username or email — resolved server-side.
  identifier: z.string().trim().min(1, "Enter your username or email"),
  password: z.string().min(1, "Enter your password"),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(100),
  username: usernameSchema,
  phone: phoneSchema,
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
