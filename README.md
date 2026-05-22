# Butlers Inc. — Premium Concierge Platform

Marketing site + members portal + booking and membership system for **Butlers Inc.**, a premium concierge service. The application handles one-off butler bookings, recurring membership subscriptions (hours/tasks bundles), an admin content/member management panel, and transactional email — all from a single Next.js codebase deployed to Vercel.

- **Production:** [butlersinc.com](https://butlersinc.com) — branch `main`
- **Staging:** [staging.butlersinc.com](https://staging.butlersinc.com) — branch `staging`

---

## Table of contents-

1. [What this is](#what-this-is)
2. [Tech stack](#tech-stack)
3. [Getting started](#getting-started)
4. [Environment variables](#environment-variables)
5. [Scripts](#scripts)
6. [Application surface area](#application-surface-area)
7. [Architecture](#architecture)
8. [Auth & authorisation](#auth--authorisation)
9. [Database (Supabase)](#database-supabase)
10. [Booking & payment flow](#booking--payment-flow)
11. [Membership tiers](#membership-tiers)
12. [Content / CMS system](#content--cms-system)
13. [Transactional email](#transactional-email)
14. [Rate limiting & security](#rate-limiting--security)
15. [Testing](#testing)
16. [Design system & UI conventions](#design-system--ui-conventions)
17. [Deployment](#deployment)
18. [Troubleshooting & references](#troubleshooting--references)

--- 

## What this is

The platform has three customer surfaces and one internal surface:

| Surface | Path | Purpose |
| --- | --- | --- |
| **Marketing site** | `/`, `/butlers`, `/butlers/[id]` | Public landing pages and butler-category pages with embedded booking flow |
| **Members portal** | `/members/*` | Auth-gated dashboard, personal/virtual butler requests, account settings |
| **Admin panel** | `/admin` | Content editing + member CRUD, gated by email allowlist + `admin_users` table |
| **API** | `/api/*` | Server endpoints for pricing, bookings, virtual tasks, checkout, webhooks, admin |

Two booking models coexist:

- **One-off priced bookings** — non-members select a butler category, options, date/time → price calculated → checkout → confirmation. Persisted to `priced_bookings`.
- **Membership requests** — logged-in members consume monthly allowances:
  - **Personal Butler** — hours-based (in-person service)
  - **Virtual Butler** — task-based (remote concierge tasks)

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | **Next.js 16** (App Router) on React 19 |
| Styling | **Tailwind CSS v4** + shadcn/ui primitives |
| Auth & DB | **Supabase** (`@supabase/ssr` for server, `@supabase/supabase-js` for client) |
| Data layer | `@tanstack/react-query` for client-side fetching |
| Forms | `react-hook-form` + `zod` |
| Animation | `motion` (Framer Motion successor) |
| Email | **Resend** + `@react-email/components` |
| Icons | `lucide-react` |
| Tests | **Vitest** + Testing Library + jsdom |
| Hosting | **Vercel** |

Node.js 20+ recommended. The project uses npm (a `package-lock.json` is committed).

---

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Create a local env file (see next section for required vars)
cp .env.local.example .env.local   # if an example file exists; otherwise create manually

# 3. Run the dev server
npm run dev
```

Open <http://localhost:3000>. The admin panel is at `/admin` (requires logging in with an allowlisted email — see [Auth & authorisation](#auth--authorisation)).

### Working without Supabase

Set `DEV_BYPASS_DB=true` in `.env.local` to bypass the booking database and use an in-memory store. Useful for frontend-only work or when you don't have Supabase credentials yet. **Do not enable this in production.**

---

## Environment variables

Create `.env.local` in the project root. All values are required unless flagged optional.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (client + server) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key (client-side) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key for privileged writes; **never expose to the browser** |
| `RESEND_API_KEY` | Resend API key for transactional emails |
| `ADMIN_EMAILS` *(optional)* | Comma-separated admin allowlist. Defaults are hard-coded in `src/lib/admin.ts` |
| `DEV_BYPASS_DB` *(optional)* | `true` = use in-memory booking store; dev only |
| `PAYMENT_GATEWAY` *(optional)* | `mock` (default) or `stripe` (not yet implemented) |

Production secrets live in Vercel — manage them via the Vercel dashboard or `vercel env` CLI rather than committing them.

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the Next.js dev server with HMR |
| `npm run build` | Production build |
| `npm start` | Run the production build locally |
| `npm run lint` | ESLint (`eslint-config-next`) |
| `npm test` | Vitest in watch mode |
| `npm run test:run` | Single-run test pass (used in CI) |
| `npm run test:coverage` | Test coverage report |

---

## Application surface area

### Public pages

```
/                                Homepage
/butlers                         Butler category listing
/butlers/[id]                    Butler detail + embedded booking flow
/booking-confirmation            Post-booking confirmation
/payment/simulate                Dev-only mock payment screen
/privacy, /terms                 Legal pages (route group: (legal))
```

### Members area (auth-required)

```
/members/login                   Public — Supabase email/password login
/members/signup                  Public — signup with auto-tier assignment
/members/dashboard               Tier badge, usage gauges (hours/tasks consumed)
/members/personal-butler         Book in-person hours from your allowance
/members/virtual-butler          Submit remote tasks (appointment, taxi, restaurant, other)
/members/settings                Profile, email, password
```

### Admin (allowlist-gated)

```
/admin                           Tabbed: content editor + member manager
```

### API routes

| Route | Method(s) | Notes |
| --- | --- | --- |
| `/api/calculate-price` | POST | Compute price for a booking config; rate-limited |
| `/api/bookings` | POST | Create a one-off booking record; rate-limited |
| `/api/create-checkout-session` | POST | Initiate mock/Stripe checkout; rate-limited |
| `/api/virtual-butler` | POST | Submit a virtual task against a member's allowance |
| `/api/webhooks/payment-complete` | POST | Payment-gateway webhook; rate-limited |
| `/api/admin/members` | GET, POST | List & create members (admin only) |
| `/api/admin/members/[userId]` | PATCH, DELETE | Update & remove a member |

---

## Architecture

```
src/
├── app/                              Next.js App Router
│   ├── (legal)/                      Route group: /privacy, /terms
│   ├── api/                          Server endpoints (see table above)
│   ├── admin/                        Admin panel
│   ├── booking-confirmation/         Post-booking thank-you page
│   ├── butlers/                      Public butler listing + detail
│   ├── members/                      Members portal (layout enforces auth)
│   ├── payment/simulate/             Dev-only mock payment screen
│   ├── layout.tsx                    Root layout, fonts, providers
│   └── page.tsx                      Homepage
│
├── components/
│   ├── admin/                        AdminTabs, MemberManager, ButlerContentEditor
│   ├── booking/                      BookingFlow, BookingForm, ServiceOptionSelector
│   ├── genie/                        Persistent "Genie" CTA (sticky bar + drawer)
│   ├── landing/                      Header, Hero, Footer, HowItWorks, ButlerCategoryGrid
│   ├── membership/                   TierBadge, UsageGauge, VirtualRequestForm
│   ├── ui/                           shadcn/ui primitives
│   ├── butler-page-sections.tsx      Reusable sections for /butlers/[id]
│   └── providers.tsx                 QueryClient + Theme + Auth providers
│
├── context/AuthContext.tsx           Supabase auth provider (React context)
│
├── data/                             Static config (single source of truth)
│   ├── booking-config.ts             Booking option catalog
│   ├── butler-page-configs.ts        Per-butler page content
│   ├── butler-tasks.ts               Task definitions per butler
│   ├── content-schema.ts             CMS content schema (Zod)
│   ├── membership-config.ts          Tiers (Lite / Essential / Heavy)
│   ├── pricing-config.ts             Pricing rules
│   └── services.ts                   Service definitions
│
├── emails/                           React Email templates (Resend)
│   ├── booking-confirmation.tsx
│   ├── booking-notification.tsx      Internal notification
│   └── components/                   Shared email building blocks
│
├── hooks/
│   ├── useMembership.ts              Member tier + usage (Supabase query)
│   └── use-site-content.ts           Merged CMS content (static + DB overrides)
│
├── lib/
│   ├── admin.ts                      Admin allowlist + isAdmin()
│   ├── content.ts                    Static-vs-DB content merge utilities
│   ├── rate-limit.ts                 Per-IP in-memory token buckets
│   ├── utils.ts                      cn() + general helpers
│   ├── payment/                      Provider pattern (mock + stripe stub)
│   │   ├── gateway.ts                Factory: returns active provider
│   │   ├── mock-gateway.ts           MockPaymentGateway (dev/staging)
│   │   └── booking-repository.ts     Persist + fetch bookings
│   ├── pricing/                      Pure pricing logic
│   │   ├── calculate-price.ts        Total computation
│   │   ├── time-slots.ts             Available slot generation
│   │   └── booking-reference.ts      Human-readable reference codes
│   └── supabase/                     client.ts + server.ts helpers
│
├── test/test-utils.tsx               Custom render wrapping providers
└── types/membership.ts               Membership/tier type definitions

middleware.ts                         Auth gate for /members/* and /admin/*
supabase/migrations/                  SQL migrations (numbered, append-only)
docs/                                 PRD, brand brief, design system, plans, audit reports
public/images/                        Static assets
scripts/seed-content.ts               One-off content seed
```

---

## Auth & authorisation

**Auth provider:** Supabase email/password.

**Client side:** `src/context/AuthContext.tsx` exposes the session via React context. Use `useAuth()` to read the current user.

**Server side:** `src/lib/supabase/server.ts` returns a server client bound to cookies; `client.ts` returns the browser client.

**Route protection:** `middleware.ts` runs on `/members/:path*` and `/admin/:path*`. Unauthenticated users are redirected to `/members/login`. The public exceptions are `/members/login` and `/members/signup`.

**Admin allowlist:** `src/lib/admin.ts` exports `isAdmin(email)`. The list comes from `ADMIN_EMAILS` env var (comma-separated) and falls back to the hard-coded `DEFAULT_ADMIN_EMAILS`. Server-side RLS policies additionally reference the `admin_users` table for database-level checks — see migration `006_admin_users_table.sql`.

---

## Database (Supabase)

Migrations live in `supabase/migrations/` and are applied in numerical order:

| File | Adds |
| --- | --- |
| `001_pricing_tables.sql` | `priced_bookings`, `bespoke_consultations` |
| `001_site_content.sql` | `site_content` (CMS overrides) |
| `002_membership_tables.sql` | `membership_tiers`, `memberships`, `personal_butler_requests`, `virtual_task_requests` |
| `003_baby_trust_indicator_copy.sql` | Seed copy update |
| `004_lock_booking_rls.sql` | Restricts booking tables to user-scoped SELECT; writes via service role only |
| `005_membership_constraints.sql` | CHECK constraints enforcing hours/task limits |
| `006_admin_users_table.sql` | `admin_users` table referenced by admin RLS policies |

**Row-level security:**

- Booking tables (`priced_bookings`, `bespoke_consultations`): user-scoped SELECT; all writes use the service-role key from API routes.
- Membership tables: scoped to `user_id`.
- Admin actions: gated against the `admin_users` table.

**Applying migrations:** use the Supabase dashboard SQL editor or the Supabase CLI (`supabase db push`).

---

## Booking & payment flow

```
Butler detail page ──► BookingFlow (multi-step)
   │
   ├─► POST /api/calculate-price        (live price preview, rate-limited)
   ├─► POST /api/bookings               (create pending booking)
   ├─► POST /api/create-checkout-session (mock/Stripe checkout)
   │
   ▼
Payment provider (currently MockPaymentGateway)
   │
   ▼
POST /api/webhooks/payment-complete    (mark booking paid)
   │
   ▼
/booking-confirmation                  (Resend email fires from server)
```

- **Payment gateway provider pattern:** `src/lib/payment/gateway.ts` returns the active gateway based on `PAYMENT_GATEWAY`. Default `mock`; `stripe` is **stubbed but not implemented** and will throw on instantiation. The mock gateway throws if `NODE_ENV=production`, so production must run with a real provider once Stripe is wired up.
- **Booking persistence:** `src/lib/payment/booking-repository.ts`. When `DEV_BYPASS_DB=true`, an in-memory store is used.
- **Pricing logic:** `src/lib/pricing/calculate-price.ts` (pure, fully unit-tested).

---

## Membership tiers

Tiers are defined in `src/data/membership-config.ts`. The shape lives in `src/types/membership.ts` and the table schema in migration `002_membership_tables.sql`.

| Tier | Slug | Monthly | Personal hours | Virtual tasks |
| --- | --- | --- | --- | --- |
| Lite | `lite` | £49 | 5 | 3 |
| Essential | `essential` | £99 | 15 | 8 |
| Heavy | `heavy` | £199 | 30 | 15 |

**Virtual task categories:** `appointment`, `taxi_airport`, `restaurant`, `other`.

**Member hourly rate:** `MEMBER_HOURLY_RATE = 35` (matches Budget Butler rate as an incentive).

`useMembership()` (`src/hooks/useMembership.ts`) joins the member's tier + usage and powers the dashboard gauges.

---

## Content / CMS system

The site uses a **layered content model**:

1. **Static defaults** ship in `src/data/*.ts` (typed via `content-schema.ts`).
2. **DB overrides** live in the `site_content` Supabase table.
3. `src/lib/content.ts` deep-merges DB values over the static defaults at request time.
4. `useSiteContent()` (`src/hooks/use-site-content.ts`) exposes the merged result.

The admin **Content Editor** tab writes overrides to `site_content` so non-technical edits do not require a deploy. Seed initial content via `scripts/seed-content.ts`.

---

## Transactional email

- **Provider:** Resend (`RESEND_API_KEY`).
- **Templates:** `src/emails/booking-confirmation.tsx`, `src/emails/booking-notification.tsx`. Built with `@react-email/components` and previewable via React Email.
- **Triggers:** server-side from API routes after successful booking/payment events.
- See `docs/email-templates/` for design references.

---

## Rate limiting & security

`src/lib/rate-limit.ts` exports per-IP in-memory token buckets:

| Limiter | Window | Max requests |
| --- | --- | --- |
| `bookingLimiter` | 60s | 5 |
| `priceLimiter` | 60s | 20 |
| `webhookLimiter` | 60s | 10 |

These are applied to `POST /api/bookings`, `POST /api/calculate-price`, `POST /api/create-checkout-session`, and `POST /api/webhooks/payment-complete`. The store is in-process and resets on cold start — adequate for current scale but worth swapping for Vercel KV/Upstash if traffic grows or the app runs on multiple instances simultaneously.

**Other hardening already in place:**

- Booking tables locked to user-scoped SELECT; service-role writes only.
- Admin emails de-hardcoded from RLS, now keyed off the `admin_users` table.
- Middleware enforces auth on all `/members/*` and `/admin/*` paths.
- Mock payment gateway refuses to instantiate in `NODE_ENV=production`.

---

## Testing

- **Runner:** Vitest with `jsdom`.
- **Config:** `vitest.config.ts`.
- **Custom render:** `src/test/test-utils.tsx` wraps `QueryClientProvider` and mocks `next/navigation`, `next/link`, and `next/image`. **Always import `render` from here, not from `@testing-library/react` directly.**
- **Location:** Tests live alongside source under `__tests__/` (e.g. `src/lib/pricing/__tests__/calculate-price.test.ts`).
- **Run all tests:** `npm run test:run`.

Coverage is strongest on pure logic (pricing, rate-limit, content merge) and key components (BookingFlow, MemberManager, UsageGauge).

---

## Design system & UI conventions

| Token | Value |
| --- | --- |
| Background | Charcoal `hsl(220 20% 18%)` |
| Accent | Brass |
| Text | Optical white |
| Fonts | **Cormorant Garamond** (serif — headings) + **Inter** (sans — body) |
| Border radius | 1–2px ("architectural precision") — use `rounded-sm`, not `rounded-lg` |
| Motion | `motion/react`; entrance animations only, always `viewport={{ once: true }}` |

UI primitives are shadcn/ui (`src/components/ui/`). The full design rationale, tokens, and brand brief live in:

- `docs/design-system.md`
- `docs/design-tokens.json`
- `docs/brand-brief.md`
- `docs/ui-ux-evaluation-framework.md` — **read this before doing any UI/UX evaluation work**
- `docs/ui-ux-audit-2026-03-20.md` — latest audit

---

## Deployment

Hosted on **Vercel** with two long-lived branches:

| Branch | Environment | Domain |
| --- | --- | --- |
| `main` | Production | butlersinc.com |
| `staging` | Preview | staging.butlersinc.com |

PRs from feature branches into `staging` produce preview URLs. Promote `staging` → `main` once verified. Environment variables are managed in the Vercel dashboard or via `vercel env`.

---

## Troubleshooting & references

- **Bug resolution log:** `docs/bug-resolution-log.md` — check here before debugging; add an entry after resolving anything non-trivial.
- **Production readiness checklist:** `docs/2026-03-31-production-readiness.md`.
- **Pricing implementation deep-dive:** `docs/butlers-inc-pricing-implementation.md`.
- **Infrastructure cost analysis:** `docs/infrastructure-costs.md`, `docs/infrastructure-research.md`.
- **PRD:** `docs/prd.md`.
- **Implementation plan history:** `docs/implementation-plan.md`, `docs/plans/`.
- **Claude Code instructions:** `CLAUDE.md` — project guidelines for the AI coding assistant (also useful as a quick orientation).

If something behaves unexpectedly in dev:

1. Confirm `.env.local` is populated.
2. Check `DEV_BYPASS_DB` — if `true`, bookings won't persist across restarts.
3. For auth issues, verify the Supabase project is reachable and the anon key matches the URL.
4. For payment flows, confirm `PAYMENT_GATEWAY` is unset or `mock` outside production.

---

## Maintaining this README

Update this file when you:

- Add a new top-level route or API endpoint
- Add or change an environment variable
- Add a new Supabase migration that introduces a table or policy
- Change membership tiers, pricing logic, or the payment provider
- Add a new conventions/patterns directory under `src/`

Keep `CLAUDE.md` in sync with the same changes — it is the AI-assistant counterpart of this document.
