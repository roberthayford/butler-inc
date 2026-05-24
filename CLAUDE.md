# Butlers Inc. — Claude Code Instructions

## Project Overview

Premium concierge service website. Next.js 16 (App Router), React 19, Tailwind CSS v4, Supabase (auth + database), Vitest + Testing Library.

## Environments

- **Production:** butlersinc.com (branch: `main`)
- **Staging/Preview:** staging.butlersinc.com (branch: `staging`)
- Hosted on Vercel

## Development

- **Dev server:** `npm run dev`
- **Build:** `npm run build`
- **Lint:** `npm run lint`

### Environment Variables

Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase client
- `SUPABASE_SERVICE_ROLE_KEY` — server-side Supabase operations
- `RESEND_API_KEY` — transactional email
- `DEV_BYPASS_DB=true` — use in-memory booking store instead of Supabase (dev only)
- `ADMIN_EMAILS` — comma-separated admin emails (optional, has defaults in `src/lib/admin.ts`)
- `NEXT_PUBLIC_SITE_URL` — canonical site origin used as fallback for Supabase `emailRedirectTo`. Set **per Vercel environment** (Production: `https://butlersinc.com`, Preview: `https://staging.butlersinc.com`). Server route handlers prefer the incoming request origin and fall back to this var via `getSiteUrl()` in `src/lib/site-url.ts`.

## Testing

- **Test runner:** `npm run test:run` (Vitest, jsdom)
- **Watch mode:** `npm test`
- **Test utilities:** `src/test/test-utils.tsx` — use this for all renders (wraps QueryClientProvider, mocks next/navigation, next/link, next/image)
- All tests live at `src/**/__tests__/*.test.tsx`

## UI/UX Evaluation

**Before evaluating, auditing, or making UI/UX changes**, always follow the framework in:
```
docs/ui-ux-evaluation-framework.md
```

The framework defines severity ratings (🔴 Critical, 🟠 Major, 🟡 Minor, 🟢 Pass), evaluation sections, and the required output format. All UI/UX work must reference it.

The latest audit report is at `docs/ui-ux-audit-2026-03-20.md`.

## Key Conventions

- **Copy rule: never use em dashes** ( — ) **in any customer-facing content** (page text, button labels, toast messages, email content, tier descriptions, form placeholders, meta descriptions). Replace with commas, periods, parentheses, or colons. Same rule for en dashes used parenthetically; en dashes are only acceptable for numeric ranges (e.g. `Mon-Fri`). Scope is user-visible strings only; code comments and internal docs are out of scope.
- Dark-first UI: charcoal background (`hsl(220 20% 18%)`), brass accent, optical-white text
- Font pairing: Cormorant Garamond (serif, headings) + Inter (sans, body)
- Border radius: 1-2px ("architectural precision"), use `rounded-sm` not `rounded-lg`
- Motion: Framer Motion (`motion/react`) for entrance animations — keep tasteful, always `viewport={{ once: true }}`
- Components: shadcn/ui primitives in `src/components/ui/`
- Data: static service config in `src/data/`
- Auth: Supabase via `src/context/AuthContext.tsx`
- Admin access: email-based allowlist in `src/lib/admin.ts`
- Forms: react-hook-form + zod validation
- Email: Resend + @react-email/components

## Architecture

```
src/app/                        # Next.js App Router pages
  page.tsx                      # Homepage
  butlers/
    layout.tsx                  # Header + Footer for all /butlers routes
    page.tsx                    # Butler listing
    [id]/page.tsx               # Individual butler page (booking flow)
  members/
    layout.tsx                  # Members area layout
    login/page.tsx              # Auth: login
    signup/page.tsx             # Auth: signup
    dashboard/page.tsx          # Member dashboard (usage gauges, tier info)
    personal-butler/page.tsx    # Personal Butler booking (hours-based)
    virtual-butler/page.tsx     # Virtual Butler requests (task-based)
    settings/page.tsx           # Account settings (profile, email, password)
  admin/page.tsx                # Admin panel (content editor + member manager, tabbed)
  booking-confirmation/         # Post-booking confirmation
  payment/simulate/             # Dev-only payment simulation
  auth/callback/route.ts        # Supabase PKCE code exchange — confirmation/magic-link landing
  (legal)/                      # Route group — Header + Footer layout for static pages
    about/page.tsx              # Placeholder
    careers/page.tsx            # Placeholder
    contact/page.tsx            # Placeholder
    cookies/page.tsx            # Placeholder
    faqs/page.tsx               # Placeholder
    ico/page.tsx                # Placeholder
    privacy/page.tsx            # Placeholder
    refund/page.tsx             # Placeholder
    terms/page.tsx              # Placeholder

src/app/api/                    # API routes
  admin/                        # Member CRUD (list, create, update)
  bookings/                     # Booking operations (server-side price recompute + hours decrement)
  calculate-price/              # Price calculation endpoint (server-derives isMember)
  create-checkout-session/      # Payment checkout initiation
  members/me/                   # Authoritative membership read (applies UIOLO rollover before returning)
  virtual-butler/               # Virtual task submission
  webhooks/payment-complete/    # Payment webhook handler

src/components/
  PlaceholderPage.tsx           # Shared shell for (legal) placeholder routes — throwaway scaffold
  landing/                      # Header, Hero, Footer (4-col / 9-link), HowItWorks, ButlerCategoryGrid
  booking/                      # BookingFlow, BookingForm, ServiceOptionSelector, PricedBookingForm
  membership/                   # TierBadge, UsageGauge, VirtualRequestForm
  admin/                        # AdminTabs, MemberManager, ButlerContentEditor
  genie/                        # GenieDrawer, GenieStickyBar (persistent CTA)
  ui/                           # shadcn primitives

src/data/                       # Static config
  services.ts                   # Service definitions
  booking-config.ts             # Booking options
  butler-page-configs.ts        # Butler page content
  butler-tasks.ts               # Task definitions per butler
  membership-config.ts          # Tier definitions (Lite/Essential/Heavy)
  pricing-config.ts             # Pricing rules
  content-schema.ts             # CMS content schema

src/lib/
  supabase/                     # client.ts, server.ts
  payment/                      # gateway.ts (provider pattern), mock-gateway.ts, booking-repository.ts (atomic hours decrement)
  pricing/                      # calculate-price.ts (member-aware), time-slots.ts, booking-reference.ts
  membership/                   # membership-reader.ts (server-side read), period-rollover.ts (UIOLO), member-hours.ts (atomic decrement helper)
  dates/                        # today-uk.ts — UK-aware "today" for period-boundary logic
  rate-limit.ts                 # In-memory per-IP rate limiting for API routes
  admin.ts                      # Admin email allowlist + isAdmin()
  content.ts                    # Content merge utilities
  site-url.ts                   # getSiteUrl(request?) — resolves canonical origin for Supabase emailRedirectTo
  utils.ts                      # Shared utilities

src/hooks/                      # Custom hooks
  useMembership.ts              # Membership data (Supabase query)
  use-site-content.ts           # CMS content hook

src/types/                      # TypeScript types
  membership.ts                 # Membership/tier type definitions

src/context/
  AuthContext.tsx                # Supabase auth provider

docs/plans/                     # Design docs and implementation plans
```

## Key Patterns

- **Payment gateway:** Provider pattern in `src/lib/payment/gateway.ts` — currently uses `MockPaymentGateway`; Stripe integration is stubbed but not implemented. Set `PAYMENT_GATEWAY=mock` (default). Mock gateway blocked in `NODE_ENV=production`.
- **Membership tiers:** Three tiers — Lite (£49, 5h / 3 tasks), Essential (£99, 15h / 8 tasks), Heavy (£199, 30h / 15 tasks) — defined in `src/data/membership-config.ts`. Tier data stored in Supabase with RLS policies. DB CHECK constraints enforce usage limits.
- **Pricing:** `calculatePricePreview()` in `src/lib/pricing/calculate-price.ts` accepts `isMember`. Members pay flat `MEMBER_HOURLY_RATE` (£50) and are exempt from urgency multipliers; non-members get the butler's hourly rate × urgency multiplier. Budget Butler is £50/hr; Bespoke is "price upon consultation" (no displayed rate). All `/api/calculate-price` and booking-submit endpoints **re-derive `isMember` server-side** from the session — client-supplied totals are recomputed and rejected on mismatch.
- **UIOLO (use-it-or-lose-it):** Membership hours/tasks reset to tier max at calendar-month boundary. Implemented as a **lazy reset** in `src/lib/membership/period-rollover.ts` — applied on every read via `/api/members/me` and `useMembership()`. UK timezone via `src/lib/dates/today-uk.ts`. No cron; no schema change. Member bookings are gated on remaining hours and decrement atomically via `src/lib/membership/member-hours.ts`.
- **Admin:** Tabbed layout (`AdminTabs`) with content editor and member manager. Access controlled by email allowlist in `src/lib/admin.ts` and `admin_users` table (RLS policies reference this table).
- **Rate limiting:** In-memory per-IP rate limiting via `src/lib/rate-limit.ts` on public API endpoints (bookings, checkout, pricing, webhooks).
- **RLS:** Booking tables (priced_bookings, bespoke_consultations) are user-scoped SELECT only; all writes via service role. Membership tables scoped to user_id. Admin actions scoped to admin_users table.
- **Genie:** Sticky bottom bar + drawer CTA that appears after scrolling, used across butler pages.
- **Content system:** Static defaults in `src/data/` merged with Supabase-stored overrides via `src/lib/content.ts`.
- **Placeholder pages:** Nine footer routes live under `src/app/(legal)/` and share `src/components/PlaceholderPage.tsx` (charcoal bg, serif h1, italic subtitle). The component is throwaway — when a page gets real content, it stops using `PlaceholderPage` and gets its own JSX.
- **Supabase email links / auth callback:** Both `signUp()` call sites (`src/context/AuthContext.tsx`, `src/app/api/members/signup/route.ts`) pass `options.emailRedirectTo` so confirmation links point at the same origin the user signed up on (client uses `window.location.origin`; server uses `getSiteUrl(request)`). The link lands on `src/app/auth/callback/route.ts`, which calls `supabase.auth.exchangeCodeForSession(code)` and redirects to `?next=` (default `/members/dashboard`). The Supabase dashboard's **Site URL** is the fallback when `emailRedirectTo` is omitted or not in the Redirect URL allowlist — keep all deploy origins (`https://butlersinc.com`, `https://staging.butlersinc.com`, `http://localhost:3000`) in the allowlist as `…/auth/callback`.

## Bug Resolution Log

Before debugging an issue, check `docs/bug-resolution-log.md` for previously resolved bugs — it may contain relevant root causes or patterns. After resolving a significant bug, add an entry with the symptom, root cause, fix, and lesson learned.

## Maintaining This File

After implementing a major feature, new route, or architectural change, update this file to reflect it. Specifically:
- New pages/routes → update Architecture tree
- New component directories → update Architecture tree
- New env vars → update Environment Variables list
- New data files or config → update Architecture tree
- New patterns or conventions → update Key Patterns or Key Conventions
