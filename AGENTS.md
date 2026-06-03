# Butlers Inc. — Codex Instructions

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

- Dark-first UI: charcoal background (`hsl(220 20% 18%)`), brass accent, optical-white text
- Font pairing: Cormorant Garamond (serif, headings) + Inter (sans, body)
- Border radius: 1–2px ("architectural precision") — use `rounded-sm` not `rounded-lg`
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
  (legal)/                      # Footer pages (terms, privacy, refund, cookies, FAQs, etc.)
  booking-confirmation/         # Post-booking confirmation
  payment/simulate/             # Dev-only payment simulation

src/app/api/                    # API routes
  admin/                        # Member CRUD (list, create, update)
  bookings/                     # Booking operations
  calculate-price/              # Price calculation endpoint
  create-checkout-session/      # Payment checkout initiation
  virtual-butler/               # Virtual task submission
  webhooks/payment-complete/    # Payment webhook handler

src/components/
  LegalPolicyPage.tsx           # Shared renderer for long-form legal policy pages
  landing/                      # Header, Hero, Footer, HowItWorks, ButlerCategoryGrid
  booking/                      # BookingFlow, BookingForm, ServiceOptionSelector
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
  legal-policies.ts             # Imported footer policy copy (terms, privacy, refund, cookies)

src/lib/
  supabase/                     # client.ts, server.ts
  payment/                      # gateway.ts (provider pattern), mock-gateway.ts, booking-repository.ts
  pricing/                      # calculate-price.ts, time-slots.ts, booking-reference.ts
  rate-limit.ts                 # In-memory per-IP rate limiting for API routes
  admin.ts                      # Admin email allowlist + isAdmin()
  content.ts                    # Content merge utilities
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
- **Admin:** Tabbed layout (`AdminTabs`) with content editor and member manager. Access controlled by email allowlist in `src/lib/admin.ts` and `admin_users` table (RLS policies reference this table).
- **Rate limiting:** In-memory per-IP rate limiting via `src/lib/rate-limit.ts` on public API endpoints (bookings, checkout, pricing, webhooks).
- **RLS:** Booking tables (priced_bookings, bespoke_consultations) are user-scoped SELECT only; all writes via service role. Membership tables scoped to user_id. Admin actions scoped to admin_users table.
- **Genie:** Sticky bottom bar + drawer CTA that appears after scrolling, used across butler pages.
- **Content system:** Static defaults in `src/data/` merged with Supabase-stored overrides via `src/lib/content.ts`.

## Bug Resolution Log

Before debugging an issue, check `docs/bug-resolution-log.md` for previously resolved bugs — it may contain relevant root causes or patterns. After resolving a significant bug, add an entry with the symptom, root cause, fix, and lesson learned.

## Maintaining This File

After implementing a major feature, new route, or architectural change, update this file to reflect it. Specifically:
- New pages/routes → update Architecture tree
- New component directories → update Architecture tree
- New env vars → update Environment Variables list
- New data files or config → update Architecture tree
- New patterns or conventions → update Key Patterns or Key Conventions
