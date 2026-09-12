# Security checklist

Finalized in Phase 12 with an actual audit pass (not just self-report) —
each item was checked by grepping/reading the real code, not assumed from
having "built it that way" earlier. Two real gaps were found and fixed
during this pass, noted inline.

- [x] **No hard-coded secrets** — grepped source for API-key-shaped
      strings (`sb_secret_`, `sb_publishable_`, JWT-shaped strings,
      inline `SUPABASE_SERVICE_ROLE_KEY=`); none found outside
      `process.env`/`getServerEnv()`/`getClientEnv()` reads. Real
      credentials only ever live in `.env.local` (gitignored) or the
      hosting platform's env var store.
- [x] **No password stored in plain text** — delegated entirely to
      Supabase Auth; this app never sees or stores a password hash.
- [x] **Admin routes protected server-side, not just UI-hidden** —
      every `/admin/**` page and every admin-only Server Action calls
      `requireAdmin()`; verified by grepping every exported function in
      every `lib/*/actions.ts` file for the auth-check call. The few
      functions without one are intentionally public (sign-up/sign-in/
      sign-out/forgot-password, the anonymous contact form, and the
      public `getCartDetailsAction` — product data is public).
- [x] **RLS enabled on every table with user-scoped data** — confirmed
      per-migration; every table has `enable row level security`.
- [ ] **RLS policies exercised by tests** — exercised extensively by live
      Playwright verification across every phase (a customer's own
      session repeatedly proven unable to see/write another customer's
      rows, unconfirmed order transitions rejected, etc.), but there is
      no automated integration-test suite that runs against a real
      Postgres + RLS in CI. Left unchecked deliberately rather than
      claiming coverage that doesn't exist — a real gap if this
      continues past a single-developer project into a team one, since
      RLS regressions in a future migration would only be caught by
      manual testing.
- [x] **Payment screenshots private** — `payment-proofs` bucket is not
      public; verified via the storage RLS migration and live-tested
      (Phase 7) that a signed URL is required to view one.
- [x] **Signed URLs used wherever a private asset is served** — the only
      private asset in the app (payment screenshots) is only ever served
      via a short-lived (5 min) signed URL, never a public one.
- [x] **Price/discount always recalculated server-side** — `create_order`
      recomputes from current `products` rows; the invoice PDF is built
      from the same re-read `OrderDetail`, never a client-supplied total.
- [x] **Stock validated server-side, race-safe (no overselling)** —
      `create_order` locks every referenced product row (`FOR UPDATE`, in
      a fixed id order to avoid deadlocks) before validating/decrementing.
- [x] **Authorization checked in every Server Action/Route Handler, not
      just middleware/proxy** — `src/proxy.ts` only does a fast
      optimistic redirect; every action/route re-checks via
      `requireUser()`/`requireAdmin()`/an explicit ownership comparison.
      The one Route Handler with a different auth model
      (`/api/cron/auto-cancel-orders`) checks a bearer-token secret
      instead, appropriately (no user session exists for a scheduled job).
- [x] **Input validated with Zod on both client and server** — every
      Server Action taking structured input calls `.safeParse()` inside
      the action itself (verified by grepping for actions that accept a
      typed `input` but never call `safeParse`; none found) — client-side
      react-hook-form validation is UX only, never trusted.
- [x] **File upload validated (type, size)** — `validateImageFile()`
      (product/banner images) and the same check reused for payment
      proofs; enforced server-side before any storage write.
- [x] **Parameterized queries only** — the Supabase client (PostgREST) is
      used throughout; no raw string-concatenated SQL anywhere in the
      codebase. The few `security definer` SQL functions use bound
      parameters (`p_order_id`, etc.), never string interpolation.
- [x] **Output encoding relies on React's default escaping; no
      `dangerouslySetInnerHTML` with untrusted input** — grepped, zero
      uses of `dangerouslySetInnerHTML` anywhere.
      **Gap found and fixed in this pass**: the transactional email
      templates (`lib/email/templates.ts`) build raw HTML via template
      literals — a path React's escaping never touches. Customer-
      controlled text (checkout full name) was being interpolated
      unescaped into emails sent to admins (new-order/new-payment
      alerts), an HTML-injection risk in any email client that renders
      HTML. Added an `escapeHtml()` helper and applied it to every
      interpolated dynamic string across every template.
- [x] **Auth endpoints rate-limited (Postgres-backed, no Redis)** —
      signup, login, forgot-password, and the public contact form are
      all rate-limited via `check_rate_limit`; fails open (never locks
      everyone out) but logs loudly on an infra error.
- [x] **Account deletion is a safe soft-delete/anonymization, not a hard
      delete of order history** — `anonymize_profile` RPC + an Auth ban
      (never a hard delete), for both a customer's own self-delete and
      the admin-triggered equivalent added in Phase 11 — `orders.customer_id`
      (FK, `on delete restrict`) always stays valid.
- [x] **Admin-sensitive actions write to `audit_logs`** —
      **Two gaps found and fixed in this pass**: `updateCategoryAction`/
      `updateTagAction` logged create/delete but not update (an
      inconsistency from Phase 4, before the audit-logging convention was
      applied everywhere), and `deleteContactMessageAction` didn't log at
      all. Both fixed. A read-only **Audit Log** admin page
      (`/admin/audit-log`) was also added in this pass — every action was
      being logged correctly since Phase 2, but nothing let an admin
      actually view the log until now.

## Additional hardening added in this pass (beyond the original checklist)

- **Security headers** (`next.config.ts`): `X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy:
  strict-origin-when-cross-origin`, a restrictive `Permissions-Policy`
  (camera/mic/geolocation all denied — none are used), and a
  `Content-Security-Policy` scoped to `'self'` plus the Supabase project
  origin (REST/Auth over http(s), Realtime over `wss://` — supabase-js
  opens that socket unconditionally even though this app doesn't use
  Realtime subscriptions). Verified live: headers present on real
  responses, and the app's actual pages (storefront + admin, including
  the Recharts dashboard and product image uploads) continued working
  with the policy active.
- **`robots.txt` / `sitemap.xml`**: account/admin/auth/API routes
  excluded from crawling (they require a session anyway); the sitemap
  covers static pages plus every active product's detail page.
- **The auto-cancel-orders cron** (`/api/cron/auto-cancel-orders`,
  wired into `vercel.json`): `admin_settings.order_auto_cancel_unconfirmed_hours`
  has existed since Phase 2 and been admin-configurable since Phase 11,
  but nothing ever enforced it — this closes that gap and gives
  `CRON_SECRET` (present in `.env.example` since Phase 1, never actually
  read anywhere until now) a real purpose.
