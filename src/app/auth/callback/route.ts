import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Single landing point for every Supabase Auth email link (signup
 * confirmation, password recovery, email change): exchanges the PKCE
 * `code` for a session — which requires setting cookies, and therefore
 * must happen in a Route Handler, not a Server Component page — then
 * routes onward based on `type`.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const type = url.searchParams.get("type");
  const next = url.searchParams.get("next");

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      if (type === "recovery") {
        return NextResponse.redirect(new URL("/reset-password", request.url));
      }
      return NextResponse.redirect(new URL(next ?? "/account", request.url));
    }
  }

  return NextResponse.redirect(
    new URL("/sign-in?error=link_expired", request.url),
  );
}
