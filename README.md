# Atelier Jewelry

A production-ready e-commerce platform for a fine-jewelry storefront: public
storefront, customer accounts, manual/offline payment workflow, order
lifecycle management, PDF invoices, notifications, and a full admin panel
(products, orders, payments, customers, reviews, banners, reports, FAQs,
settings).

Built with Next.js (App Router) + TypeScript + Tailwind + shadcn/ui on the
frontend, and Supabase (Postgres + Auth + Storage + RLS) on the backend —
designed to run entirely on free tiers (Vercel + Supabase) to start.

## Project status

This README is updated as each phase below completes. See
[`docs/PROGRESS.md`](./docs/PROGRESS.md) for a detailed running log.

| Phase | Status |
| --- | --- |
| 1. Project setup (Next.js, Tailwind, shadcn/ui, theme system, folder structure) | ✅ Done |
| 2. Database (migrations, RLS, seed data) | ✅ Done — verified against a real local Postgres |
| 3. Authentication & authorization | ✅ Done — verified end-to-end locally |
| 4. Products (CRUD, images, tags, search, filters, stock) | ✅ Done — verified in a real browser (Playwright) |
| 5. Storefront (home, product list, product detail, cart) | ✅ Done — verified in a real browser (Playwright) |
| 6. Orders (checkout, statuses, history) | ✅ Done — verified in a real browser (Playwright) |
| 7. Payments (methods, proof upload, approval) | ✅ Done — verified in a real browser (Playwright) |
| 8. Notifications & email | ✅ Done — verified in a real browser (Playwright) + real Gmail SMTP send |
| 9. Invoices (PDF) | ✅ Done — verified in a real browser (Playwright), real PDF inspected |
| 10. Reviews | ✅ Done — verified in a real browser (Playwright) |
| 11. Admin (dashboard/reports, settings, banners, FAQs, contact, customers, reviews moderation, notifications) | ✅ Done — verified in a real browser (Playwright + live), one real bug found & fixed |
| 12. Security/perf/a11y audit, tests, deployment docs | ⏳ Pending |

## Tech stack

- **Frontend**: Next.js 16 (App Router, Turbopack), TypeScript, Tailwind CSS v4, shadcn/ui (Radix), Lucide icons, React Hook Form + Zod, TanStack Table, Recharts
- **Backend**: Next.js Route Handlers + Server Actions + Server Components, Supabase (Postgres, Auth, Storage, RLS)
- **Email**: SMTP via Nodemailer (e.g. Gmail with an app password) — dev-mode console/log transport when `SMTP_HOST`/`SMTP_USER`/`SMTP_PASSWORD` are unset
- **PDF invoices**: `@react-pdf/renderer` (server-side)
- **Cart state**: Zustand, persisted to `localStorage` only — never the database
- **Testing**: Vitest + Testing Library

## Prerequisites

- **Node.js 22+ strongly recommended.** Next.js 16 itself only requires
  20.9+, but `@supabase/supabase-js` now targets Node 22+ and its
  `RealtimeClient` needs a native `WebSocket` global (added in Node 22).
  This repo runs on Node 20.17 via two small compatibility shims —
  `jsdom` pinned to `25.0.1` (latest requires Node's `require(esm)`,
  20.19+/22.13+) and a `ws`-based `WebSocket` polyfill in
  `src/instrumentation.ts` + `scripts/seed.ts` (see comments there). Both
  are safe to remove once you're on Node 22+.
- npm 10+
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — only if you want to run Supabase locally (recommended for development; see below). Not needed if you develop directly against a hosted Supabase project.
- A free [Supabase](https://supabase.com) account/project (for staging/production; optional for local-only development)
- A free [Vercel](https://vercel.com) account (for deployment)
- [Supabase CLI](https://supabase.com/docs/guides/local-development) — already installed as a dev dependency, use via `npx supabase ...`

## 1. Supabase setup

You can develop against a fully local Supabase stack (fast, free, no
account needed) or a hosted project. Both use the same migrations/seed.

### Option A — Local (recommended for development)

```bash
npx supabase start
```

This pulls the Supabase Docker images (first run only, a few minutes),
starts a local Postgres, applies every migration in
`supabase/migrations/`, and runs `supabase/seed.sql`. It prints an
`API_URL`, `ANON_KEY`, and `SERVICE_ROLE_KEY` — copy those into
`.env.local` (see below). Supabase Studio (a local dashboard for browsing
tables/auth/storage) is served at `http://127.0.0.1:54323`.

Stop it with `npx supabase stop` (add `--no-backup` to also wipe the local
database).

### Option B — Hosted project

1. Create a new project at [supabase.com](https://supabase.com/dashboard).
2. In **Project Settings → API**, copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server-only, never expose to the client)
3. Link it and push the migrations: `npx supabase link --project-ref YOUR_PROJECT_REF`, then `npx supabase db push`.
4. Run `psql "$DATABASE_URL" -f supabase/seed.sql` (or paste it into the SQL editor in the dashboard) to load sample catalog data.
5. *(Filled in during a later phase)* Configure Auth redirect URLs and email templates for production.

## 2. Environment variables

```bash
cp .env.example .env.local
```

Fill in the values from step 1 above (local or hosted). Never commit `.env.local`.

## 3. Install & run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## 4. Database migrations & seed data

If you used `npx supabase start` (Option A above), migrations and
`seed.sql` were already applied. To re-apply after pulling new migrations:

```bash
npm run db:migrate   # supabase db push (hosted) — for local, use `npx supabase db reset` to reapply everything
```

Then bootstrap the admin account (works against either local or hosted,
based on the Supabase URL/keys in `.env.local`):

```bash
npm run seed
```

## 5. Admin bootstrap

`npm run seed` creates a single admin account from `ADMIN_BOOTSTRAP_*` env
vars via the Supabase Auth admin API (not raw SQL — `auth.users` is
Supabase-managed), and sets `must_change_password` so the default password
is forced to change on first login (redirected to `/force-password-change`
automatically). The password is never logged or returned by any API. Sign
in at `/sign-in` with `ADMIN_BOOTSTRAP_USERNAME` — admins land on
`/admin`, customers on `/account`.

## 6. Testing

```bash
npm run typecheck
npm run lint
npm run test
```

## 7. Deployment (Vercel + Supabase, free tier)

*(Filled in during Phase 12.)*

## Architecture notes / decisions

Documented here as they're made, since the original spec leaves some
implementation details open:

- **Next.js 16**: this project was scaffolded on Next.js 16.3.4, which
  renamed `middleware.ts` → `proxy.ts` (function `proxy`, Node.js runtime
  only) and made several other breaking changes vs. Next 15. Route
  protection lives in `src/proxy.ts`.
- **Cart**: Zustand store persisted to `localStorage` (per spec Rule 7) —
  never written to the database. Stock is re-validated server-side on
  cart-open/checkout (Rule 8).
- **PDF invoices**: generated server-side with `@react-pdf/renderer` from
  data recomputed/read from the database (never trusting client totals).
- **Rate limiting**: a lightweight Postgres-backed limiter for auth
  endpoints (no Redis), to stay on free-tier infrastructure.
- **Currency**: PKR (`en-PK`), matching the JazzCash/EasyPaisa payment
  method examples in the spec. Change `CURRENCY` in `src/constants/index.ts`
  if needed.

## Security checklist

Tracked in [`docs/SECURITY.md`](./docs/SECURITY.md), finalized in Phase 12.
