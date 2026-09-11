# Build log

Running log of what was implemented in each phase, and decisions made along
the way for anything the spec left ambiguous. Newest entries at the top.

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
