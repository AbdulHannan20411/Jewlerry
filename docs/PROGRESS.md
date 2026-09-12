# Build log

Running log of what was implemented in each phase, and decisions made along
the way for anything the spec left ambiguous. Newest entries at the top.

---

## Phase 12 — Security/performance/accessibility audit, tests, deployment docs

**Date:** 2026-09-12

A real audit pass, not a self-report: every check in `docs/SECURITY.md`
was verified by actually grepping/reading the code (e.g. "does every
admin action call `requireAdmin()`" was answered by a small script
scanning every exported function in every `lib/*/actions.ts`, not by
recalling how it was built). Two real gaps found and fixed:

- **HTML injection in transactional emails**: `lib/email/templates.ts`
  builds raw HTML via template literals — a path React's default
  escaping never touches. Customer-controlled text (checkout full name)
  was interpolated unescaped into emails sent to *admins* (new-order/
  new-payment alerts), a stored HTML-injection risk in any HTML-rendering
  email client. Added an `escapeHtml()` helper, applied to every
  interpolated dynamic string across every template, and added a
  regression test (`tests/unit/email-templates.test.ts`) asserting a
  `<script>`/`onerror=` payload in a customer name or admin-composed
  notification never survives into the rendered HTML unescaped.
- **Inconsistent audit logging**: `updateCategoryAction`/`updateTagAction`
  logged create/delete but not update (a Phase-4-era inconsistency, from
  before the audit-log convention was applied everywhere), and
  `deleteContactMessageAction` didn't log at all. Both fixed.

Also closed two "configured but never enforced" gaps discovered while
checking `CRON_SECRET` (scaffolded in `.env.example` since Phase 1) and
`admin_settings.order_auto_cancel_unconfirmed_hours` (schema since Phase
2, admin-configurable since Phase 11) — neither actually did anything
until now:

- **`/api/cron/auto-cancel-orders`**: cancels `unconfirmed` orders older
  than the configured threshold, wired into `vercel.json` (daily —
  Vercel's Hobby/free plan caps cron frequency at once/day; Pro allows
  finer granularity). Verified live end-to-end: backdated a real order's
  `created_at`, hit the endpoint with the correct bearer secret, confirmed
  the order flipped to `cancelled`, the customer got their usual
  order-status-changed notification/email, and an `order.auto_cancelled`
  audit row was written — also confirmed the endpoint 401s on a missing
  or wrong secret.
- **A read-only Audit Log admin page** (`/admin/audit-log`): every
  sensitive action has written to `audit_logs` since Phase 2, but nothing
  ever let an admin actually view it. Added `lib/audit-log/queries.ts` +
  a simple searchable table, left-joined to `profiles` for a display name
  ("System" for a null `actor_id` — cron/service-role-triggered rows).

### Other hardening added

- **Security headers** (`next.config.ts`): `X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy:
  strict-origin-when-cross-origin`, a `Permissions-Policy` denying
  camera/mic/geolocation (none used), and a `Content-Security-Policy`
  scoped to `'self'` + the Supabase project origin (its `wss://` Realtime
  endpoint included, since supabase-js opens that socket unconditionally
  even though this app never subscribes to anything). Verified live:
  headers present on real responses (`curl -I`), and — more importantly —
  the app kept working under the policy (confirmed via the user's own
  concurrent live usage of checkout/orders while the headers were active,
  plus a direct check of the storefront/admin pages including the
  Recharts dashboard and product image uploads).
- **`robots.txt` / `sitemap.xml`**: account/admin/auth/API routes excluded
  from crawling (all require a session anyway); sitemap covers static
  pages + every active product.
- **Accessibility spot-check**: grepped every `next/image` usage for a
  missing `alt`, and every icon-only `Button` for a missing
  `aria-label` — zero real gaps found in app code (the one hit was a
  vendored shadcn calendar day-cell button, a false positive — the day
  number text is its own accessible name).
- **Deployment documentation**: README's Vercel + Supabase section
  (previously a stub) now covers the full path — env vars, pointing
  Supabase Auth's redirect URLs at the real domain, bootstrapping the
  admin account against the hosted project, the cron job's Vercel-plan
  caveat, and a post-deploy smoke-test checklist.

### Left deliberately unchecked

`docs/SECURITY.md` records one item as explicitly *not* satisfied rather
than papering over it: there's no automated integration-test suite
exercising RLS against a real Postgres in CI. Coverage so far is real but
manual (every phase's live Playwright verification repeatedly proved a
customer's own session can't see/write another customer's rows, illegal
transitions get rejected, etc.) — solid for a single-developer project,
but a genuine gap if this codebase grows a team.

**Status: all 12 phases complete.**

---

## Phase 11 — Admin (dashboard/reports, settings, banners, FAQs, contact, customers, reviews moderation, notifications)

**Date:** 2026-09-11

The largest single phase — most Zod schemas (`bannerFormSchema`, `faqFormSchema`,
`siteSettingsFormSchema`, `sendNotificationSchema`, `blockCustomerSchema`) were
already scaffolded back in Phase 1, so this was mostly wiring queries/
mutations/actions/UI on top of existing validation + RLS.

- **Settings**: two new tabs on the existing admin settings page — Store
  (`site_settings`: name/contact/hours/low-stock threshold/shipping cost/
  currency/dark-mode toggle) and Automation (`admin_settings`: invoice
  prefix, auto-cancel window, admin notification toggles). The
  `notify_admin_on_new_order`/`notify_admin_on_payment_submitted` columns
  existed since Phase 2 but were previously dead — Phase 8's
  `notifyOrderCreated`/`notifyPaymentSubmitted` now actually read them
  (via a new `getAdminSettingsWith(supabase)` that takes an explicit
  client, since those events run under the service-role client from
  customer-triggered actions, not an admin session) before deciding
  whether to alert admins at all.
- **Banners**: full image-upload CRUD (`lib/storage/images.ts`'s
  `uploadPublicImage`, same helper product images use), including
  `datetime-local` start/end scheduling converted to/from ISO for Zod's
  `.datetime()`.
- **FAQs**: plain dialog CRUD, same shape as Tags/Categories.
- **Contact messages**: admin inbox (expandable list, mark-read-on-open,
  mailto reply link, delete).
- **Customers**: list (search + active/blocked filter) and detail page
  (order history + total spent) with block/unblock (direct RLS write —
  no service-role) and an admin-triggered delete that reuses the same
  `anonymize_profile` RPC + Auth ban pair as the customer's own
  self-delete (`lib/auth/actions.ts`), minus the password re-entry since
  admin authority is already established. Blocking now also sends the
  customer a notification + email (new `notifyCustomerBlocked` event,
  `accountBlockedEmail` template).
- **Reviews moderation**: admin list across every product (including
  hidden), joined directly to `profiles.full_name` (admin bypasses the
  "can't read another customer's profile" RLS restriction, so — unlike
  the public product-page list — no RPC needed here) and hide/show via
  `protect_review_columns`' admin-only `is_hidden` toggle.
- **Notifications composer**: wraps Phase 8's `sendNotificationAction`
  with a UI — broadcast to all customers or a live-searched multi-pick of
  specific ones (debounced customer search via
  `searchCustomersForPickerAction`).
- **Dashboard**: replaced the Phase-1 three-stat placeholder with real
  Recharts — a 30-day revenue area chart, an orders-by-status bar chart,
  and top-5-products-by-units-sold — plus quick-glance alert badges
  (payments awaiting review, unconfirmed orders, low stock, unread
  messages) linking straight to the relevant admin page. `lib/reports/
  queries.ts` defines "revenue" consistently as orders that reached
  `confirmed`/`in_process`/`delivered`/`completed` (payment actually
  received) — the same set used for a customer's "total spent" on their
  admin detail page.

### A real bug caught by live verification, not by typecheck/build

`getRevenueOverTime`'s day-bucketing used local-time `Date` methods
(`setDate`/`setHours(0,0,0,0)`/`getDate()`) to build the 30 calendar-day
keys, then compared against `created_at` timestamps serialized as UTC
ISO strings. On a server whose local timezone isn't UTC — this
environment runs Asia/Karachi, UTC+5 — local midnight is the *previous*
UTC calendar day, so every bucket key was silently off by one day, and
**"today"'s revenue bucket never existed at all**, disappearing entirely
from the chart and the total shown. The dashboard displayed "Rs 0" in
30-day revenue despite real confirmed/delivered orders existing. Fixed by
switching entirely to `Date.UTC(...)`/`getUTCDate()` arithmetic so bucket
keys always line up with the UTC dates Postgres actually returns —
verified directly against the database afterward (3 orders, Rs 39,450,
today's bucket present) rather than trusting the fix by inspection alone.
This is exactly the class of bug that never shows up on a UTC CI runner
or a US-timezone developer's machine, which is why it's flagged here.

### Verified live — partially interleaved with the user's own concurrent testing

Confirmed via server logs that every admin action distinctly traceable to
the verification script executed cleanly end-to-end with no thrown
errors: store/automation settings save, banner create + update + delete
(image upload included), FAQ create + delete, contact message mark-read +
delete. The user was actively using the same local dev server at the
same time (signing up test accounts, editing banners themselves) — some
of the script's own UI assertions timed out under that shared load and
against data the user was concurrently changing, which is why the
customer block/unblock and notifications-composer steps weren't
re-confirmed with a clean automated run; rather than keep running heavy
automation against a session the user was actively driving, verification
stopped there once the code paths involved (same RLS/action patterns as
everything else in this phase, all independently exercised elsewhere)
gave enough confidence, and the one substantive finding (the revenue
bug) was isolated and fixed with a focused, read-only check instead.

**Next:** Phase 12 — Security/performance/accessibility audit, tests,
deployment documentation.

---

## Phase 10 — Reviews (submission/edit/delete)

**Date:** 2026-09-11

- Most of the enforcement already existed from Phase 2:
  `validate_review_eligibility` (trigger — a review can only be inserted
  if the named order actually contains that product for that customer and
  has reached `delivered`/`completed`), `refresh_product_rating` (keeps
  `products.average_rating`/`review_count` in sync, excluding hidden
  reviews), and RLS that lets a customer write/update/delete **their own**
  review rows directly — unlike orders/payments, reviews don't need a
  SECURITY DEFINER RPC or the service-role client; the trigger is the
  real guarantee either way.
- `lib/reviews/queries.ts` (extended — Phase 5 already had the read-only
  `getProductReviews`): `getMyReviewForProduct` (direct table query, not
  the public RPC — RLS lets a customer always select their own row
  regardless of `is_hidden`), `getEligibleReviewOrderId` (mirrors the
  trigger's own eligibility SQL in JS, so the UI never offers a review
  the trigger would reject), `getReviewForOrderItem` (per order-line CTA
  state), `getCustomerReviews` ("My Reviews" list, joined to product
  name/slug/image).
- `lib/reviews/{mutations,actions}.ts`: `createReview`/`updateReview`/
  `deleteReview` take the *caller's own* session client. Update/delete
  don't need an explicit ownership check in application code — RLS scopes
  them to the caller already, so a foreign review id just matches 0 rows,
  which the mutation treats as "not found" rather than needing to
  distinguish "forbidden" from "doesn't exist."
- UI: `ReviewFormDialog` (create/edit, interactive star-rating input,
  optional title/comment) + `DeleteReviewButton`, wired into three spots —
  the product detail page (write, or edit/delete an existing review, next
  to the existing read-only list), the account order-detail page (a
  review CTA per line item once the order is delivered/completed), and a
  new `/account/reviews` "My Reviews" page. Added `/account/reviews` and
  `/account/notifications` (Phase 8 gap) to the account sidebar nav.

### Verified live (Playwright), the full lifecycle including the rating-aggregate trigger

Advanced a real order to `delivered` (admin status control) → customer's
product page then showed "Write a review" → submitted a 5-star review →
product page immediately showed edit/delete instead, review text visible,
**`products.average_rating`/`review_count` correctly updated to `(5, 1)`**
(checked directly in the database, not just the UI) → "My Reviews" page
listed it → edited the rating → deleted it → **rating aggregate correctly
reset to `(0, 0)`** on delete, "My Reviews" back to empty state. Zero
console/page errors across the whole run.

**Next:** Phase 11 — Admin (dashboard with real charts, reports, banners
CRUD, customers management, reviews moderation, notifications composer,
contact messages, FAQs CRUD, full settings).

---

## Phase 9 — Invoices (PDF)

**Date:** 2026-09-11

- `lib/invoices/invoice-document.tsx`: a `@react-pdf/renderer` document
  (`Document`/`Page`/`View`/`Text`, not React DOM — never sent to the
  browser as HTML) styled to match the app's ivory/gold/dark-brown design
  system. Built entirely from `OrderDetail` — same data already re-read
  from the database for the order pages, so the invoice can never reflect
  a stale/tampered client-side total.
- `app/api/invoices/[orderId]/route.ts` (the app's first Route Handler
  under `/api`): `renderToBuffer` the document server-side and stream it
  back as `application/pdf` with a `Content-Disposition: attachment`
  filename of the order's invoice number. Access mirrors every other
  order-detail page: the order's own customer, or an admin — checked
  explicitly in the handler (not just left to RLS), since `getOrderById`
  already returns `null` for an order outside the caller's own RLS
  visibility, but the ownership check still runs for defense in depth.
- "Invoice" buttons (plain `<a href="/api/invoices/{id}">`, not a client
  fetch — a real download link is simpler and works everywhere) added to
  both the customer and admin order-detail page headers.

### Verified live (Playwright + direct PDF inspection)

Signed in as the customer, fetched `/api/invoices/{own order}` with the
session cookie — `200`, `application/pdf`, a real PDF (`%PDF` header) —
then opened it and visually confirmed correct branding, invoice/order
number, itemized total matching the order, and address. Fetching another
customer's order id came back `404` (RLS on the underlying `orders` query
already scopes it out before the ownership check even runs). Signed in as
admin, fetched the same customer's invoice successfully (`200`).

**Next:** Phase 10 — Reviews (submission/edit/delete tied to purchase
eligibility; read-only display already built in Phase 5).

---

## Phase 8 — Notifications & email

**Date:** 2026-09-11

- **Email switched from the originally planned Resend to SMTP (Nodemailer)**:
  the user provided real Gmail SMTP credentials (an app password) mid-build
  instead of a Resend API key, so `lib/email/send.ts` wraps
  `nodemailer.createTransport` (lazily built, cached at module scope) rather
  than the Resend SDK. `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASSWORD`
  replace `RESEND_API_KEY` in `lib/env.ts`/`.env.example`. When unset, mails
  are logged to the server console instead of sent — same dev-safe default
  as before, just a different transport underneath. A failed send is caught
  and logged, never thrown — a notification email must never fail the
  order/payment action that triggered it.
- `lib/email/templates.ts`: one shared inline-styled HTML layout (email
  clients strip `<style>` tags) + a template function per event: order
  confirmation, order status changed, payment submitted/approved/rejected
  (customer-facing), new-order/new-payment-to-review (admin-facing).
- `lib/notifications/{queries,mutations,actions}.ts`: the in-app
  `notifications` table (Phase 2 schema) — list + unread-count summary,
  mark-one/mark-all read, and an admin broadcast (`sendNotificationAction`,
  single/selected/all-customers) using the `sendNotificationSchema`
  already defined in Phase 1's validations. All notification writes use
  the service-role client — `notifications_insert_admin`'s RLS policy only
  covers an admin's *own* session writing directly, not the normal
  system-triggered path.
- `lib/notifications/events.ts`: the single integration point between
  order/payment business logic and both side effects (in-app row + email)
  — `notifyOrderCreated`, `notifyOrderStatusChanged`, `notifyPaymentSubmitted`,
  `notifyPaymentApproved`, `notifyPaymentRejected`. Wired into
  `lib/orders/actions.ts` (createOrderAction, cancelOrderAction,
  requestReturnAction, updateOrderStatusAction) and `lib/payments/actions.ts`
  (submitPaymentAction, reviewPaymentAction). Order-status notifications are
  deliberately *not* sent for the `unconfirmed ↔ payment_pending ↔ confirmed`
  transitions the payment RPCs drive — those already get their own
  dedicated payment-submitted/approved/rejected messaging, so a customer
  never gets two overlapping emails for one event.
- UI: a `NotificationBell` (server component, renders nothing signed-out) +
  `NotificationDropdown` (client) in both the storefront header and the
  admin layout — unread badge, latest 5, mark-read on click, "mark all
  read". Full paginated list at `/account/notifications`
  (`NotificationList`, typed icon per `NotificationTypeValue`).
- All independent notification/email dispatches within one event now run
  concurrently (`Promise.all`), not sequentially — a real SMTP send takes
  real network seconds, and this sits on the critical path of the
  Server Action that awaits it (a single customer+admin order-created
  event was ~5s sequential; live-tested this is the right fix, not a
  premature optimization). Still fully synchronous/awaited overall, which
  is a known latency tradeoff worth revisiting in Phase 12 (background
  job / `waitUntil` on serverless) if it matters at real scale.

### Verified live — both with the local dev transport and the user's real Gmail SMTP

Confirmed the exact Gmail credentials work by sending one real email
directly via Nodemailer (accepted by Gmail, `250 2.0.0 OK`) before wiring
anything else — cheapest way to isolate "are the credentials right" from
"is the app's plumbing right." Then, restarting the dev server with the
real SMTP env vars (no dev-console fallback), drove the full lifecycle in
a real browser: customer places an order → **"Order placed"** notification
+ email to the customer, **"New order"** notification + email to every
admin (both created within the same request, confirmed via direct DB
query) → customer submits a payment → **"Payment submitted"** (customer) +
**"Payment awaiting review"** (admin) → admin approves →
**"Payment confirmed"** (customer), order moves to `confirmed`. Zero
console/page errors; zero `[email] send failed` lines in the server log
across the whole run (i.e. every real SMTP send that ran during
verification actually succeeded, not silently swallowed).

**Next:** Phase 9 — Invoices (PDF via `@react-pdf/renderer`).

---

## Phase 7 — Payments (methods, proof upload, admin approval/rejection)

**Date:** 2026-09-11

- `lib/payments/{queries,mutations,actions}.ts`: `getPaymentMethods`/
  `getPaymentMethodById` (joins `payment_method_details` for SWIFT/branch
  code/QR), `searchPayments`/`getPaymentById`/`getPaymentsForOrder` (the
  last one returns every attempt for an order, not just the latest — a
  rejected submission can be followed by a new one). `submitPaymentRpc`/
  `reviewPaymentRpc` are thin wrappers around the Phase 2 `submit_payment`/
  `review_payment` SQL functions; `createPaymentMethodAction`/
  `updatePaymentMethodAction`/`deletePaymentMethodAction` are plain admin
  CRUD (not RPC-gated — only `payments` rows themselves are RPC-only).
- `lib/storage/payment-proofs.ts`: upload/signed-URL helpers for the
  private `payment-proofs` bucket. Upload uses the *caller's own* session
  client (not service-role) so `storage.objects` RLS is actually exercised
  — a customer can only ever write into `{their own uid}/...`, structurally.
  Admin review reads back via a short-lived (5 min) signed URL, never a
  public one.
- Customer flow: order detail page shows the latest payment attempt +
  status; a "Proceed to payment" / "Submit a new payment" (after a
  rejection) button links to `/account/orders/[id]/pay` —  method picker
  (with that method's account/instructions shown inline), optional
  transaction reference/note, required screenshot upload.
- Admin flow: `/admin/payments` (status-filterable list) and
  `/admin/payments/[id]` — screenshot viewer + Approve/Reject (reject
  requires a reason from `PAYMENT_REJECTION_REASONS`). `/admin/payment-methods`
  is plain dialog-based CRUD, same pattern as Tags/Categories. Both the
  customer and admin order-detail pages also show a compact payment-status
  card/list linking to the review page.

### Two real bugs caught by live verification (not by typecheck/build)

- `next/image` only allowlisted the Supabase storage host for
  `/storage/v1/object/public/**` — payment screenshots are deliberately
  never public, so the admin review page's signed URL (`/object/sign/**`)
  was silently rejected. Added a second `remotePatterns` entry for the
  `sign` path, and derived the protocol (`http`/`https`) from
  `NEXT_PUBLIC_SUPABASE_URL` instead of hardcoding `https` — local dev
  talks to Supabase over plain http (`127.0.0.1:54321`).
- Next's image optimizer separately refuses to fetch from a private/local
  IP by default (SSRF hardening) — blocks local Supabase entirely
  regardless of the allowlist. Fixed with `images.dangerouslyAllowLocalIP`,
  gated to `NODE_ENV === "development"` (the hosted project is a public
  HTTPS domain, so production never needs this).

Also (not a bug, expected behavior): the Phase 3 login rate limiter
(5 attempts / 5 min per IP+identifier) tripped partway through repeated
Playwright re-runs against the same admin account — confirms it's working
as designed, just needed clearing (`rate_limit_counters`) between test
iterations.

### Verified live (Playwright), both outcomes

Admin: create/edit/delete a payment method → payments list. Customer:
sign in → add to cart → checkout (new `unconfirmed` order) → submit
payment (method + reference + screenshot upload) → order shows "Pending
review". Admin: review page renders the screenshot and details →
**Approve** → payment row `approved`, order transitions to `confirmed`
(verified in the DB directly). Separately, full **reject** path: reject
with a reason + note → payment `rejected`, order reverts to `unconfirmed`,
customer's order page shows the rejection reason and a "Submit a new
payment" CTA. Zero console/page errors across both runs.

**Next:** Phase 8 — Notifications & email. User has provided Gmail SMTP
credentials (app password) for this phase instead of/alongside Resend —
to be wired into `.env.local` only (never committed) when this phase
starts.

---

## Phase 6 — Orders (checkout, creation, statuses, history)

**Date:** 2026-09-11

- `lib/orders/transitions.ts`: the app-layer mirror of the DB trigger's
  transition table, plus two narrower rulesets on top of it —
  `canCustomerTransition` (Rule 5: a customer can only ever cancel
  pre-shipment or request a return post-delivery, never self-advance to
  confirmed/processing/delivered/completed) and `canAdminTransition`
  (excludes the transitions that must only ever happen as a side effect of
  an actual payment record — `unconfirmed -> payment_pending` needs a real
  `submit_payment` row to review, `payment_pending -> confirmed/
  unconfirmed` needs `review_payment`'s audit trail — never a bare manual
  status edit for either). `adminNextStatuses()` drives which buttons the
  admin order page actually offers. Unit-tested (18 new cases).
- `lib/orders/mutations.ts`: thin RPC wrappers for `create_order` /
  `change_order_status`, plus `friendlyCreateOrderError()` translating the
  RPC's structured exception strings (`INSUFFICIENT_STOCK:id:name:qty`,
  `PRODUCT_NOT_FOUND:id`, `ORDER_EMPTY`) into customer-facing messages.
- `lib/orders/actions.ts`: `createOrderAction` (checkout — requires
  sign-in, since `orders.customer_id` is a NOT NULL FK, so there's no
  guest checkout in this schema), `cancelOrderAction` /
  `requestReturnAction` (customer self-service, transition-checked),
  `updateOrderStatusAction` (admin, transition-checked + audited). Order
  mutations beyond the pure status change (`cancelled_reason`,
  `return_reason`/`return_notes`/`returned_at`) are separate service-role
  `.update()` calls alongside the `change_order_status` RPC call — added a
  narrow `orders.Update` type (just those four columns, explicitly
  excluding `status`) so this stays structurally safe without needing yet
  another RPC.
- Checkout (`/checkout`): delivery form + live order review (re-fetched
  stock/price, same as the cart page) + summary; `createOrderAction`
  clears the cart and routes straight to the new order's detail page on
  success.
- Customer order history (`/account/orders`, `/account/orders/[id]`):
  paginated list, detail page with itemized total, delivery info, and a
  timeline built directly from `order_status_history` (which — since it
  only ever contains transitions that actually happened — needs no
  filtering to satisfy "only show stages that have happened"). Cancel/
  return-request buttons appear only when `canCustomerTransition` allows it.
- Admin orders (`/admin/orders`, `/admin/orders/[id]`): searchable
  (order/invoice number) + status-filterable table; detail page's
  `OrderStatusControl` renders exactly `adminNextStatuses()` as buttons,
  each opening a reason dialog before confirming.
- Shared `OrderStatusBadge` (8-status color mapping) and a generic
  `FilterSelect` (URL-param-driven, joining `SearchInput`/`SortSelect`/
  `PaginationControls` as reusable admin+storefront table controls).

### Verified live (Playwright): the full acceptance-criteria customer loop, so far

Sign up → sign in → browse → add to cart → checkout → **place order**
(`create_order` RPC, sequential `ORD-2026-000001`/`INV-2026-000001`) →
order appears in "My Orders" → **admin sees it in `/admin/orders`** →
admin opens it → status control offers exactly the right next steps →
change status → history updates. Zero console errors.

That run caught a real design gap, fixed before commit: the admin status
control initially also offered "Payment Pending" as a manual move from
Unconfirmed — technically valid per the raw transition table, but wrong,
since nothing would back that status with an actual payment row for
admin to later review. Added `unconfirmed -> payment_pending` to
`canAdminTransition`'s exclusion list (alongside the pre-existing
`payment_pending -> confirmed/unconfirmed` exclusion) so both
payment-related transitions are exclusively RPC-driven, never a manual
status edit.

**Next:** Phase 7 — Payments (methods, proof upload, admin approval/rejection).

---

## Hosted Supabase project deployed

**Date:** 2026-09-11

Pushed the full schema to the user's real hosted Supabase project
(`wapunpgqxavbyrxxdyai`, region `ap-northeast-2`) and bootstrapped it:
all 14 migrations, `seed.sql` catalog data, and the admin account
(`must_change_password: true`, verified via a REST query against the
live project). Credentials were used transiently (shell env vars for a
single command each) and never written to any tracked file.

**Note for local dev going forward:** `.env.local` still points at the
local Docker Supabase instance (deliberately, to avoid iterative
Playwright-driven dev/testing writing test data into the real project).
The hosted project's URL/keys are what go into Vercel's environment
variables at actual deploy time (Phase 12) — see README's deployment
section.

**Environment gap found along the way:** the direct DB hostname
(`db.<ref>.supabase.co`) is IPv6-only for this (and apparently all newer)
Supabase projects; this sandbox has no IPv6 route, so `supabase db push`
against it fails with a DNS resolution error. The fix is using the
**connection pooler** hostname instead (`Project Settings → Database →
Connection string → Session/Transaction pooler`, not "Direct
connection") — IPv4-compatible. Worth remembering for anyone hitting the
same thing.

---

## Phase 5 — Storefront (home, product list, product detail, cart)

**Date:** 2026-09-11

- Moved `/account` and `/` into a new `(storefront)` route group so they
  share `SiteHeader`/`SiteFooter` (account pages get the main nav — cart
  icon, theme toggle, sign-in/account link — same as any other e-commerce
  site); `(auth)`, `/admin`, and the system pages (`/forbidden`,
  `/account-suspended`, etc.) deliberately keep their own minimal shells.
- `store/cart-store.ts`: Zustand + `persist` (localStorage only, per Rule
  7 — just `{ productId, quantity }`, never price/name/image). Gated
  behind the same `useMounted()` hydration-safe pattern as the theme
  toggle (server/first-client-render always sees an empty cart).
- `lib/orders/queries.ts` (`refreshCartDetails`) + a public
  `getCartDetailsAction`: Rule 8 — re-fetches current price/stock/name/
  image for every cart line from the server, every time the cart page
  loads. Lines that no longer exist or are inactive/out-of-stock are
  flagged (not silently dropped); the cart client auto-clips any quantity
  exceeding fresh stock and toasts that it did so.
- `search_products` (Phase 4) now also powers the storefront: product
  list page (search + tag/category/price/rating/in-stock filters + sort +
  pagination, all URL params) and the home page's Featured/New/Sale rails.
- Product detail page: image gallery, price/discount/stock display,
  quantity-bounded add-to-cart, and a review summary + list using a new
  `get_product_reviews` RPC (see below) — reading, not yet writing;
  submission needs purchase eligibility, landing in Phase 10.
- Banners (Phase 2 table) wired up for real: `getActiveBanners` filters to
  `is_active` AND within `[start_date, end_date]`, feeding a small
  auto-advancing carousel on the home page.
- Built out `/contact` (store info from `site_settings` + a rate-limited
  contact form writing to `contact_messages`) and `/faq` (accordion over
  `faqs`) — not explicitly one of Phase 5's four pages, but the site
  header/footer nav links to both unconditionally, so leaving them as
  dead links wasn't acceptable; both were quick given the tables/RLS
  already existed from Phase 2.
- New migration 0014, `get_product_reviews`: profiles RLS deliberately
  blocks reading another customer's profile row, but a public review list
  needs *some* display name for its author. Rather than loosen profiles
  RLS, added a narrow `SECURITY DEFINER` RPC that exposes only a computed
  display name (never email/phone/role) for a product's visible reviews.
- Root layout now reads `site_settings.dark_mode_enabled` (via a
  `React.cache()`-wrapped `getSiteSettings()`, deduping what would
  otherwise be 3 separate queries per page — layout, header, footer) and
  passes `forcedTheme="light"` down when the admin has disabled dark mode
  site-wide — the Phase 1 `AppProviders`/`ThemeProvider` plumbing for this
  existed already, just wasn't wired up yet. Known tradeoff: this makes
  every storefront page dynamic (no static prerendering), since the root
  layout now does a DB read on every request; acceptable for now, worth
  revisiting with a time-based cache if it matters later.

### Verified live (Playwright)

Home → products list (search "ring", tag/category/price/rating filters,
sort) → product detail → add to cart → cart page (correct price/subtotal/
shipping/total) → contact → FAQ, zero real console errors. See the bigint
migration entry above for the full detail — the first verification run
surfaced the seed-data UUID bug that migration fixes.

---

## Architecture change — bigint identity PKs (except profiles.id)

**Date:** 2026-09-11

Per explicit user direction, every table's primary key was converted from
`uuid default gen_random_uuid()` to `bigint generated always as identity`,
with matching foreign keys — **except** `profiles.id`, which stays `uuid`
because it's a 1:1 FK to Supabase Auth's `auth.users.id` (always UUID,
not something this app controls), and therefore every FK that points at
profiles (`customer_id`, `actor_id`, `user_id`, `changed_by`,
`reviewed_by`, ...) stays `uuid` too. Everything else — products,
categories, tags, orders, order_items, reviews, payments, payment_methods,
notifications, banners, contact_messages, faqs, audit_logs — is now
`bigint`.

All 14 existing migrations were edited in place (they had only ever been
applied to a local throwaway Docker instance, never a real project, so
this is "fix the migration before first deploy," not "patch a deployed
schema"). Notable knock-on effects:

- `create_order`'s two-pass logic could no longer pre-generate an id
  (`gen_random_uuid()`) before the `INSERT` the way it did for UUIDs — a
  `bigint generated always as identity` value doesn't exist until the row
  is actually inserted. Restructured so the order row is inserted (letting
  the identity auto-generate) right after pass-1 validation, and pass-2
  (stock decrement + order_items) uses the returned `v_order.id`.
- `seed.sql` got simpler: explicit small integers (`1, 2, 3, ...` via
  `overriding system value`) instead of hand-typed UUID literals, with
  `setval()` calls at the end to keep each identity sequence ahead of the
  seeded rows.
- Added a doc comment to `database.ts` and `seed.sql` explaining *why*
  IDs split this way, so it isn't "fixed" back to all-UUID or all-bigint
  by a future edit that doesn't know about the Supabase Auth constraint.

### A real bug this surfaced (caught live, not by typecheck)

Before this change, `seed.sql` used human-readable placeholder UUIDs like
`c0000000-0000-0000-0000-000000000001` — valid enough for Postgres's
`uuid` type (which barely validates format) but **not** valid per
RFC-4122 (the version nibble must be 1-8; these all had `0`). Zod's
`z.uuid()` — used in `getCartDetailsAction`'s validation — correctly
rejected them. This meant "Add to cart" silently failed for every seeded
product (toast said "Invalid cart data," cart page showed empty) while
real `gen_random_uuid()`-generated rows worked fine — exactly the kind of
bug that only shows up with seed data and never in production. Fully
mooted by the bigint switch (plain integers have no such validity
question), but worth remembering: **never hand-type UUID literals**;
generate them (`crypto.randomUUID()` / `gen_random_uuid()`).

### Verified live, twice (once per major flow)

Reset the local DB, re-ran the full migration set + updated seed
end-to-end successfully, then re-ran both Playwright verification flows
from scratch:
- **Storefront**: home → products list/search/filters → product detail →
  add to cart → cart page (correct name/price/qty/subtotal/shipping/total
  with the new bigint product id) → contact → FAQ. Zero real console
  errors (one hydration warning traced to a Playwright/headless-Chromium
  `caret-color` DOM-mutation artifact from `.fill()` calls, not app code).
- **Admin**: sign in → forced password change → products table (bigint
  ids) → edit page at `/admin/products/1` (clean integer in the URL) →
  create a new product → lands on `/admin/products/13` (identity sequence
  correctly continuing past the 12 seeded rows) → delete. Zero console
  errors.

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
