import { z } from "zod";

/**
 * Validates process.env at import time so a missing/misconfigured variable
 * fails fast at boot (or build) instead of surfacing as a confusing runtime
 * error deep inside a Supabase call. Server and client schemas are split so
 * a server-only secret (service role key) can never accidentally end up in
 * a client schema.
 */

const serverSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  RESEND_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.string().min(1).default("Atelier Jewelry <onboarding@resend.dev>"),
  SITE_URL: z.url().default("http://localhost:3000"),
  ADMIN_BOOTSTRAP_USERNAME: z.string().min(1).default("admin"),
  ADMIN_BOOTSTRAP_PASSWORD: z.string().min(8).default("Admin@123"),
  ADMIN_BOOTSTRAP_EMAIL: z.email().default("admin@atelier.local"),
  CRON_SECRET: z.string().min(1).optional(),
});

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
});

function parse<T extends z.ZodTypeAny>(schema: T, source: Record<string, string | undefined>) {
  const result = schema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Invalid environment variables:\n${issues}\n\nCheck your .env.local against .env.example.`,
    );
  }
  return result.data as z.infer<T>;
}

// Only validated (and only importable) on the server — importing this from a
// Client Component is a build-time error because of the server-only guard.
export function getServerEnv() {
  if (typeof window !== "undefined") {
    throw new Error("getServerEnv() must not be called from the client.");
  }
  return parse(serverSchema, process.env);
}

export function getClientEnv() {
  return parse(clientSchema, {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  });
}
