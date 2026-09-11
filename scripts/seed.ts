/**
 * Bootstraps the single admin account via the Supabase Auth Admin API
 * (which plain SQL — supabase/seed.sql — cannot do, since auth.users is
 * managed by Supabase Auth). Run with `npm run seed`.
 *
 * Idempotent: re-running it against an already-seeded project updates the
 * existing admin's role/flags rather than erroring, so it's safe to run
 * again after `supabase db reset` re-applies supabase/seed.sql.
 *
 * The bootstrap password is read from ADMIN_BOOTSTRAP_PASSWORD, used once
 * to create the Auth user, and never logged, stored elsewhere, or returned
 * by any API afterward. must_change_password is set so the admin is forced
 * to change it on first login (see proxy.ts / app/admin/layout.tsx).
 */
import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import WebSocketImpl from "ws";
import type { Database } from "../src/types/database";

// See src/instrumentation.ts for why this is needed on Node < 22.
if (!globalThis.WebSocket) {
  // @ts-expect-error -- API-compatible for supabase-js's purposes.
  globalThis.WebSocket = WebSocketImpl;
}

if (existsSync(".env.local")) {
  loadEnv({ path: ".env.local" });
} else {
  loadEnv();
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const username = process.env.ADMIN_BOOTSTRAP_USERNAME ?? "admin";
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD ?? "Admin@123";
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL ?? "admin@atelier.local";

  if (!url || !serviceRoleKey) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
        "Copy .env.example to .env.local and fill in your Supabase project's credentials first.",
    );
    process.exit(1);
  }

  const admin = createClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`Seeding admin account (username: ${username})...`);

  // Does a profile with this username already exist?
  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id, role")
    .eq("username", username)
    .maybeSingle();

  let userId: string;

  if (existingProfile) {
    userId = existingProfile.id;
    console.log(`  Found existing profile ${userId} — ensuring it's an admin.`);
  } else {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username, full_name: "Store Admin" },
    });

    if (createError || !created.user) {
      console.error("Failed to create admin auth user:", createError?.message);
      process.exit(1);
    }

    userId = created.user.id;
    console.log(`  Created auth user ${userId}.`);

    // The on_auth_user_created trigger inserts the profile row synchronously
    // as part of the same INSERT, so it should already exist here.
  }

  const { error: updateError } = await admin
    .from("profiles")
    .update({
      role: "admin",
      must_change_password: true,
      blocked_at: null,
      blocked_reason: null,
      deleted_at: null,
    })
    .eq("id", userId);

  if (updateError) {
    console.error("Failed to promote profile to admin:", updateError.message);
    process.exit(1);
  }

  console.log("Admin account ready.");
  console.log(`  Username: ${username}`);
  console.log(`  Email:    ${email}`);
  console.log("  Password: (the value of ADMIN_BOOTSTRAP_PASSWORD in your .env.local — not printed here)");
  console.log("  This account must change its password on first login.");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
