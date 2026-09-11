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
| 2. Database (migrations, RLS, seed data) | ⏳ Next |
| 3. Authentication & authorization | ⏳ Pending |
| 4. Products (CRUD, images, tags, search, filters, stock) | ⏳ Pending |
| 5. Storefront (home, listing, detail, cart) | ⏳ Pending |
| 6. Orders (checkout, statuses, history) | ⏳ Pending |
| 7. Payments (methods, proof upload, approval) | ⏳ Pending |
| 8. Notifications & email | ⏳ Pending |
| 9. Invoices (PDF) | ⏳ Pending |
| 10. Reviews | ⏳ Pending |
| 11. Admin (dashboard, reports, settings, banners, FAQs, contact) | ⏳ Pending |
| 12. Security/perf/a11y audit, tests, deployment docs | ⏳ Pending |

## Tech stack

- **Frontend**: Next.js 16 (App Router, Turbopack), TypeScript, Tailwind CSS v4, shadcn/ui (Radix), Lucide icons, React Hook Form + Zod, TanStack Table, Recharts
- **Backend**: Next.js Route Handlers + Server Actions + Server Components, Supabase (Postgres, Auth, Storage, RLS)
- **Email**: Resend (dev-mode console transport when `RESEND_API_KEY` is unset)
- **PDF invoices**: `@react-pdf/renderer` (server-side)
- **Cart state**: Zustand, persisted to `localStorage` only — never the database
- **Testing**: Vitest + Testing Library

## Prerequisites

- Node.js **20.19+** recommended (20.9+ is the Next.js 16 minimum; a couple
  of dev-only sub-dependencies want 20.19+). This repo was scaffolded and
  verified against Node 20.17 by pinning `jsdom` to `25.0.1` — if you're on
  Node 20.19+ or 22.13+, you may freely upgrade `jsdom` to latest.
- npm 10+
- A free [Supabase](https://supabase.com) account/project
- A free [Vercel](https://vercel.com) account (for deployment)
- Optional: [Supabase CLI](https://supabase.com/docs/guides/local-development) (installed as a dev dependency — `npx supabase ...`) if you want to run Postgres locally via Docker instead of against the hosted free-tier project

## 1. Supabase setup

1. Create a new project at [supabase.com](https://supabase.com/dashboard).
2. In **Project Settings → API**, copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server-only, never expose to the client)
3. *(Filled in during Phase 3)* Configure Auth redirect URLs, email templates, and Storage buckets.

## 2. Environment variables

```bash
cp .env.example .env.local
```

Fill in the values described in `.env.example`. Never commit `.env.local`.

## 3. Install & run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## 4. Database migrations & seed data

*(Filled in during Phase 2.)*

```bash
npm run db:migrate   # supabase db push
npm run seed          # creates the bootstrap admin + sample catalog data
```

## 5. Admin bootstrap

*(Filled in during Phase 3.)* The seed script creates a single admin account
from `ADMIN_BOOTSTRAP_*` env vars, with `must_change_password` set so the
default password is forced to be changed on first login. The password is
never logged or returned by any API.

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
