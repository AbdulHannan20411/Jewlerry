# Build log

Running log of what was implemented in each phase, and decisions made along
the way for anything the spec left ambiguous. Newest entries at the top.

---

## Phase 4 — Products (CRUD, images, tags, categories, search/filter/sort/stock)

**Date:** 2026-09-11

- `search_products` (migration 0013): the one query behind both the admin
  product table and the eventual storefront listing — full-text search
  (`websearch_to_tsquery` over the `search_vector` generated column),
  tag/category/price/rating/stock/new-within-days filters, a fixed sort
  enum (see the "one param, all-other-branches-null" trick in the SQL
  comment), and pagination via `count(*) over()` — all in one round trip.
  Deliberately **not** `security definer`: it runs with the caller's own
  RLS, so `p_include_inactive=true` from a non-admin is a no-op, not a
  bypass.
- `lib/products/{queries,mutations,actions,pricing}.ts`: queries wrap the
  RPC + batch-fetch tags per product (avoids embedding complexity in the
  RPC's typed return); mutations are plain functions taking a Supabase
  client (reused by both the eventual customer-facing paths and admin);
  actions.ts is the `'use server'` layer — `requireAdmin()` + Zod
  validation + audit log + `revalidatePath` around every mutation.
- `lib/storage/images.ts`: shared upload/delete helper (validates type/size,
  writes to `${folder}/${nanoid()}.${ext}`) reused for product images now,
  banners/avatars later — takes the caller's own Supabase client so
  storage.objects RLS is actually exercised, not just bypassed via
  service-role.
- Admin UI: `/admin/products` (search + sort + paginated table, stock/status
  badges), `/admin/products/new` + `/admin/products/[id]` (form + image
  manager — upload/reorder-via-arrows/delete, no drag-and-drop library),
  `/admin/tags` and `/admin/categories` (dialog-based create/edit, search +
  pagination for tags). Categories isn't in the admin sidebar (not in the
  spec's nav list) — reachable from the Products page's "Manage
  categories" button instead.
- Generic, reusable admin infrastructure (will carry through Orders/
  Customers/Reviews in later phases): `components/admin/data-table.tsx`
  (TanStack Table v8, manual/server-driven — sorting, filtering, and
  pagination are all URL params the Server Component page reads, not
  client table state), `search-input.tsx` / `sort-select.tsx` /
  `pagination-controls.tsx` (each drives a URL param), and
  `confirm-delete-button.tsx` (one AlertDialog wrapper for every "delete
  this" admin action).
- `components/forms/`: added `select-field.tsx` (Select + Switch, RHF
  `Controller`-based) and `tag-multi-select.tsx` (Command+Popover
  combobox) to the Phase 3 text-field kit.
- Badge component gained `success`/`warning` variants (matching the
  existing `--success`/`--warning` design tokens from Phase 1) — used by
  the new `StockBadge` shared component (in/low/out of stock, text label
  always present so state is never color-only, per accessibility
  guidance).
- Discount math (`computeDiscount`) is the one place price display logic
  lives, unit-tested (`tests/unit/pricing.test.ts`) — never trust a
  discount amount/percentage computed client-side.
- Product delete is a real hard delete (not soft/deactivate): order_items
  already snapshot name/price/image independently
  (`product_id` is `on delete set null`), so removing a product can never
  corrupt a historical order. Deleting also cleans up its Storage images.

### Verified live (browser-driven, not just typecheck/build)

No `chromium-cli` in this environment, so used Playwright directly
(`npx playwright install chromium`, a throwaway `--no-save` install, script
run from `scripts/` for module resolution then deleted). Full flow: sign in
as the bootstrap admin -> forced password change -> `/admin/products`
(all 12 seeded products render with images/discount%/stock/status/tags) ->
create a new product -> lands on its edit page -> search filters correctly
-> delete via the confirm dialog. **Zero browser console errors** on the
final clean run.

That run caught two real bugs neither `typecheck` nor `build` could have
caught (both are now fixed and covered by the fix being load-bearing for
the verification to pass at all):
- `RESEND_API_KEY=` (empty string) in `.env.local` failed
  `z.string().min(1).optional()` — an empty env var is not the same as an
  unset one to Zod. Fixed with an `optionalString()` helper in
  `lib/env.ts` that preprocesses `"" -> undefined` before validation.
- `next/image` rejected `picsum.photos` (used by `supabase/seed.sql`'s
  placeholder images) — `next.config.ts`'s `remotePatterns` only
  allowlisted the Supabase storage hostname. Added picsum.photos, but
  gated behind `NODE_ENV === "development"` so production doesn't carry
  an allowlisted host that's never used outside dev seed data.

Also downgraded `@tanstack/react-table` from `^9.2.4` (resolved to a
just-released v9 with a completely different `TableFeatures`-based API —
no `useReactTable`/`getCoreRowModel`) to the stable, well-documented
`8.21.3` line, which is what `components/admin/data-table.tsx` actually
targets.

### A recurring Zod v4 + RHF typing gotcha (worth knowing for later forms)

`z.coerce.number()` gives a schema an input type of `unknown` for that
field (pre-coercion) but an output type of `number` (post-coercion).
`useForm<OutputType>({ resolver: zodResolver(schema) })` then mismatches,
because `zodResolver`'s inferred `Resolver<Input, Context, Output>` doesn't
line up with a `useForm` generic pinned to `Output`. Fixed by exporting
both `z.input<>` (`*RawInput`) and `z.output<>` (`*Input`, used everywhere
outside the form) types from the validation schema, and using RHF's
3-generic form: `useForm<RawInput, unknown, Input>(...)`. Separately, any
schema with a top-level `.refine()` widens `errors.<field>`'s type to
`Merge<FieldError, FieldErrorsImpl<{}>>` — the form-field components' `error`
prop now accepts `FieldError | Merge<...>` (see the `FieldErrorLike` alias
in `text-field.tsx`/`select-field.tsx`) rather than plain `FieldError`.

**Next:** Phase 5 — Storefront (home, product list, product detail, cart).

---

## Phase 2 & 3 — Database + Authentication/Authorization

**Date:** 2026-09-11

### Database (Phase 2)

12 migrations in `supabase/migrations/`, covering every table in the spec
plus a few structural additions: `categories` (real taxonomy, alongside
`tags` for cross-cutting labels like "Sale"/"Featured"), `rate_limit_counters`
(Postgres-backed fixed-window limiter, no Redis), and `payment_method_details`
(1:1 extension table for less-common fields like SWIFT code, keeping
`payment_methods` itself simple).

Business-critical logic lives in **SQL functions**, not just application
code, so it can't be bypassed by a bug or a future direct query:

- `create_order` — the concurrency-safe checkout core. Locks every
  referenced product row (`FOR UPDATE`, in a fixed id order to prevent
  deadlocks between simultaneous checkouts), validates stock against
  *current* rows, computes the subtotal from *current* server-side prices,
  snapshots shipping cost from `site_settings`, decrements stock, and
  writes frozen `order_items` snapshots — all in one transaction.
- `change_order_status` — the only way an order's status changes; a
  trigger (`validate_order_status_transition`) enforces the same
  transition table as `ORDER_STATUS_TRANSITIONS` in
  `src/constants/index.ts` (keep both in sync), and every change is logged
  to `order_status_history` atomically.
- `submit_payment` / `review_payment` — orchestrate payment + order status
  together (submit: unconfirmed -> payment_pending; approve: -> confirmed;
  reject: -> unconfirmed), each locking rows to stay race-safe.
- `validate_review_eligibility` (trigger) — a review can only be inserted
  if the named order actually contains that product for that customer and
  has reached delivered/completed. `refresh_product_rating` (trigger)
  keeps `products.average_rating`/`review_count` in sync, excluding hidden
  reviews.
- `anonymize_profile` — self-delete/admin-delete path: rewrites
  name/username/email to anonymized values and sets `deleted_at`, but
  never removes the row, so `orders.customer_id` (FK, `on delete
  restrict`) always stays valid. Paired with banning (not deleting) the
  matching `auth.users` row via the Auth admin API from application code.
- `protect_*_columns` triggers on `profiles`/`reviews`/`payments`/
  `notifications` — defense-in-depth column-level protection (e.g. a
  customer's own `UPDATE` on their profile silently can't change `role`,
  `blocked_at`, `deleted_at`, `must_change_password`) on top of (not
  instead of) RLS and application-level authorization checks.

RLS is enabled on every table. Client roles (anon/authenticated) never get
direct `INSERT`/`UPDATE` access to `orders`, `order_items`,
`order_status_history`, or `payments` — all writes to those go through the
SECURITY DEFINER RPCs above, called from Server Actions using the
service-role client after an application-level authorization check.

**Verified against a real database, not just written blind:** the Supabase
CLI's local stack (`supabase start`, Docker/Postgres 17) applied all 12
migrations and `seed.sql` cleanly. Manually exercised end-to-end against
the running instance:
- signup -> `handle_new_user` trigger creates the profile row correctly
- a customer `PATCH`ing their own `role` to `"admin"` via the REST API
  directly (bypassing the app entirely) — the request "succeeds" but
  `protect_profile_privileged_columns` silently reverts it; role stays
  `customer`
- `create_order` on a seeded product: correct subtotal/shipping/total,
  sequential `ORD-2026-000001`/`INV-2026-000001` numbers, stock decremented
  correctly
- ordering more than available stock -> rejected with
  `INSUFFICIENT_STOCK:<id>:<name>:<available>`
- an illegal status jump (`unconfirmed` -> `delivered` directly) ->
  rejected by the transition trigger
- `submit_payment` -> order moves to `payment_pending`; `review_payment`
  (approve) -> order moves to `confirmed`

### Authentication & Authorization (Phase 3)

- Three Supabase client factories: `lib/supabase/server.ts` (RLS-scoped,
  cookie-bound, for Server Components/Actions/Route Handlers),
  `lib/supabase/client.ts` (browser), `lib/supabase/admin.ts`
  (service-role, `server-only`-guarded so it can't be imported into a
  Client Component bundle).
- `lib/permissions`: `requireUser()` / `requireAdmin()` /
  `isCurrentUserAdmin()`. Documented and followed throughout: these are
  called from **every** Server Action and Route Handler individually, not
  just from the page/layout that renders the form — Server Functions are
  directly POST-able and would otherwise bypass a layout-only check.
- `src/proxy.ts` (Next 16's renamed `middleware.ts`): refreshes the
  Supabase session cookie on every request and does a fast *optimistic*
  redirect for signed-out visitors hitting `/account` or `/admin`. Per the
  Next.js docs, this is deliberately NOT the real authorization boundary —
  `lib/permissions` is.
- Login accepts **username or email**: `lookup_email_for_login` (SQL,
  SECURITY DEFINER, `service_role`-only grant) resolves the identifier
  server-side, then the real `signInWithPassword` call always runs (even
  against a synthetic email when nothing resolves) so a nonexistent-user
  attempt and a wrong-password attempt are indistinguishable.
- Forgot-password always returns the same generic response, regardless of
  whether the email exists *or whether the request was rate-limited* —
  timing is the only remaining (accepted, minor) side channel.
- Password-recovery/email-confirmation links land on `/auth/callback` (a
  Route Handler — cookies can only be set there, not in a Server Component
  page) which exchanges the PKCE code for a session, then routes onward
  (`/reset-password` for recovery, `/account` otherwise).
- Rate limiting on signup/login/forgot-password via the
  `check_rate_limit` Postgres function (fixed window, keyed by IP +
  identifier) — fails open on an infra error (never lock everyone out) but
  logs loudly.
- Admin bootstrap: `scripts/seed.ts` creates the admin via the Auth admin
  API (not raw SQL — `auth.users` is Supabase-managed) and sets
  `must_change_password = true`. `/admin/layout.tsx` redirects such an
  admin to `/force-password-change`, a standalone route (deliberately
  outside `/admin` and `/account`) so there's no redirect loop. **Verified
  live**: ran `npm run seed` against the local instance, confirmed the
  admin can sign in and `must_change_password` is set.
- `next.config.ts`: `experimental.authInterrupts` enabled, so
  `lib/permissions.requireAdmin()` calls `forbidden()` (renders
  `app/forbidden.tsx`, 403) instead of an ad-hoc redirect.
- Account deletion (`deleteAccountAction`): password re-entry required,
  then `anonymize_profile` RPC + `auth.admin.updateUserById(..., {
  ban_duration: "87600h" })` (ban, never hard-delete — keeps
  `orders.customer_id` valid forever).

### Fixes discovered only by actually building/running this

- **`Database` type needed `Relationships: []` on every table** to satisfy
  supabase-js's `GenericTable` constraint — without it, the *entire*
  schema silently fell back to untyped/`never`, breaking every
  `.from()`/`.rpc()` call's typing at once. Easy to miss since the error
  messages point at the call sites, not the actual cause.
- **supabase-js v2's `SupabaseClient` unconditionally constructs a
  `RealtimeClient`**, which needs a global `WebSocket` — native only from
  Node 22+. This app never uses Realtime (spec explicitly rules out
  WebSockets for notifications), but every server-side Supabase client
  call still threw on Node 20 without a polyfill. Fixed via
  `src/instrumentation.ts` (Next's server-startup hook, using the `ws`
  package) for the app, and a matching inline polyfill in the standalone
  `scripts/seed.ts`. Documented in-file; safe to delete once on Node 22+.
- `next typegen`'s `LayoutProps<'/route'>` / typed `redirect()`/`router.push()`
  reject dynamic (non-literal) route strings — used `as Route` casts for
  the few genuinely dynamic redirects (`returnTo` query params).
- `jsdom@27` (latest) requires Node's `require(esm)` support (20.19+);
  pinned to `25.0.1` for this Node 20.17 machine (see Phase 1 notes).
- shadcn's Nova preset doesn't ship a classic `form.tsx` — it ships
  `field.tsx` (`Field`/`FieldLabel`/`FieldError`/etc.) instead. Built a
  small `components/forms/text-field.tsx` kit (`TextField`,
  `TextareaField`, `PasswordField`) around it, reused across every form in
  the app rather than wiring RHF's `Controller` by hand each time.

**Local dev workflow now fully working end-to-end**: `supabase start`
(Docker) -> `.env.local` pointed at `http://127.0.0.1:54321` -> `npm run
seed` -> `npm run dev`. Supabase Studio at `http://127.0.0.1:54323` for
poking at the local DB directly.

**Next:** Phase 4 — Products (CRUD, images, tags, search, filters, stock).

---

## Phase 1 — Project setup

**Date:** 2026-09-11

- Scaffolded Next.js 16.3.4 (App Router, Turbopack, TypeScript, Tailwind v4,
  `src/` dir, `@/*` import alias) via `create-next-app`.
- Initialized shadcn/ui (Radix base, Nova preset) and added the full set of
  primitives the app will need (button, input, form/field, table, dialog,
  sheet, dropdown, tabs, accordion, calendar, command, etc.).
- Built the **Atelier** design system in `src/app/globals.css`: ivory/gold/
  dark-brown light theme, a hand-tuned (not inverted) deep-brown/warm-ivory/
  muted-gold dark theme, plus a dedicated dark-brown admin sidebar palette
  for both modes. Added `success`/`warning` semantic tokens (spec calls for
  status badges beyond shadcn's default primary/destructive).
- Added `Cormorant Garamond` (serif) for headings via `next/font/google`,
  layered over Geist Sans/Mono for body/mono — gives the storefront an
  "atelier" feel instead of a generic SaaS look.
- `ThemeProvider` (next-themes, class strategy) + `AppProviders` wrapper
  (Tooltip provider + Sonner toaster). `AppProviders` accepts a
  `forcedTheme="light"` prop for when an admin disables dark mode
  site-wide (wired up once `admin_settings` exists in Phase 11 — the prop
  is ready now so the root layout won't need restructuring later).
- Full `src/` architecture per spec (`app/(storefront)`, `app/(auth)`,
  `app/account`, `app/admin`, `app/api`, `components/*`, `lib/*`, `hooks`,
  `types`, `constants`, `services`, `db`) plus `supabase/migrations`,
  `scripts`, `tests/unit`.
- `src/constants/index.ts`: single source of truth for roles, stock-status
  thresholds/logic, the full order-status transition table (spec's allowed
  transitions, encoded as data so `lib/orders` can validate against it
  later), payment statuses/rejection reasons, notification types,
  pagination defaults, storage bucket names, image upload limits.
- `src/lib/env.ts`: Zod-validated env access, split into server/client
  schemas so the service-role key can never end up in a schema a Client
  Component could import.
- Vitest + Testing Library wired up; first real test
  (`tests/unit/constants.test.ts`) covers the stock-status boundary logic
  required by the spec's testing checklist.
- Verified: `npm run typecheck`, `npm run lint`, `npm run build`, and
  `npm run test` all pass clean.

### Decisions / deviations worth flagging

- **Next.js 16, not 15.** The spec says "latest stable," and 16.3.4 was
  current at scaffold time. This *is* a materially different framework
  version from most existing tutorials/training data — notably
  `middleware.ts` is renamed `proxy.ts` (nodejs-only runtime, no more Edge
  option there). Route protection will be implemented as `src/proxy.ts`.
- **jsdom pinned to 25.0.1**, not latest (27.x), purely because latest
  jsdom's CSS-color dependency chain requires Node's `require(esm)`
  support, which needs Node 20.19+/22.13+; this machine has 20.17. No
  functional loss for our test suite; bump it once Node is upgraded.
- **Currency defaulted to PKR** based on the JazzCash/EasyPaisa payment
  method examples in the spec. Easily changed in `src/constants/index.ts`.
- Package manager: npm (per user selection). Build strategy: full build,
  all 12 phases, proceeding without per-phase approval gates (per user
  selection) — still checkpointing here after each phase and running
  typecheck/lint/build/test before moving on.

**Next:** Phase 2 — database schema, migrations, RLS policies, seed data.
This needs real Supabase project credentials (user is creating a project
and will provide `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
/ `SUPABASE_SERVICE_ROLE_KEY`).
