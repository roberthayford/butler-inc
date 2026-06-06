# Butlers Inc. — Claude Code Instructions

## Project Overview

Premium concierge service website. Next.js 16 (App Router), React 19, Tailwind CSS v4, Supabase (auth + database), Vitest + Testing Library.

## Philosophy

Deliberate choices that shape how to extend this codebase. Default to the existing in-process pattern before reaching for external infrastructure:

- **Payment runs through a gateway abstraction.** `MockPaymentGateway` is the default for local dev (fast, offline). `StripeGateway` is now fully implemented and selected via `PAYMENT_GATEWAY=stripe` (test keys on staging, live keys in production). `getPaymentGateway()` isolates every consumer, so prefer extending the gateway over wiring Stripe calls into routes/components directly.
- **No cron, no background jobs.** UIOLO resets are a lazy reset on read, not a scheduled task. Rate limiting and the dev booking store are in-memory. Prefer lazy / in-process patterns over queues, schedulers, or workers until there is a concrete need.
- **Webhooks are the source of truth for provisioning**, not success URLs (per Stripe's recommendation). State changes belong in the webhook handler.

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
- `MEMBERSHIP_ADMIN_NOTIFY_EMAIL` — admin recipient for membership lifecycle notifications (new member, payment failed, pause, cancellation scheduled, cancellation final). Resolution order: this var, then `BOOKING_ADMIN_NOTIFY_EMAIL`, then first email in `ADMIN_EMAILS`.
- `NEXT_PUBLIC_SITE_URL` — canonical site origin used as fallback for Supabase `emailRedirectTo`. Set **per Vercel environment** (Production: `https://butlersinc.com`, Preview: `https://staging.butlersinc.com`). Server route handlers prefer the incoming request origin and fall back to this var via `getSiteUrl()` in `src/lib/site-url.ts`.
- `PAYMENT_GATEWAY` — `mock` (default) or `stripe`. Selects which `PaymentGateway` implementation `getPaymentGateway()` returns. `/api/webhooks/stripe` now **requires** an explicit value (returns 500 if unset, preventing silent downgrade to mock mode in production).
- `MOCK_WEBHOOK_SECRET` — **required** in every environment that runs `PAYMENT_GATEWAY=mock` (local, Preview, Staging). Used by `signMockWebhook()` in `/payment/simulate-portal` to sign synthetic events with HMAC-SHA256, and verified by `verifyMockWebhook()` in `/api/webhooks/stripe`. **Closes the pre-fix accept-any-value `x-mock-signature: 1` gate** that let attackers forge events on internet-facing staging. Generate per env: `openssl rand -hex 32`. Treat as a secret, do not commit.
- `STRIPE_SECRET_KEY` — required when `PAYMENT_GATEWAY=stripe`. Consumed by `StripeGateway` (lazily constructs `new Stripe(key, { apiVersion })`) and by the setup script. Use a **test** key (`sk_test_…`) on staging; live key only in production. `StripeGateway` throws a clear error on first use if this is unset in stripe mode.
- `STRIPE_WEBHOOK_SECRET` — required in stripe mode to verify webhook signatures in `StripeGateway.parseWebhookEvent` (`stripe.webhooks.constructEvent`). Local dev: the `whsec_…` printed by `stripe listen`. Staging/prod: the dashboard webhook endpoint's signing secret.
- `STRIPE_PRICE_LITE` / `STRIPE_PRICE_FREQUENT` / `STRIPE_PRICE_PRO` — Stripe price IDs resolved by `getTierPriceId()` in `src/lib/membership/tier-pricing.ts`. Falls back to `mock_<slug>` when unset. Populate from `npm run stripe:setup` output (`scripts/stripe/setup-products.mjs`).
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — client-side Stripe.js, when Stripe Elements is wired (not needed today: checkout + portal are Stripe-hosted via redirect)

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

## Hard Constraints (Never)

- **Never merge or promote to `main` without explicit approval.** `staging` is the integration branch; promoting to production is always a separate, explicitly requested step.
- **Never use em dashes in customer-facing copy** (see Key Conventions for full scope). This is the most-violated rule in the codebase.
- **Never let `PAYMENT_GATEWAY=mock` run in production.** `getPaymentGateway()` throws when `NODE_ENV=production` and the gateway is mock; do not weaken that guard.
- **Never ship `/api/webhooks/stripe` without an explicit `PAYMENT_GATEWAY`.** The route returns 500 when it is unset, on purpose, to prevent silent downgrade to mock mode.
- **Never trust client-supplied prices or `isMember`.** `/api/calculate-price` and all booking-submit routes re-derive `isMember` server-side and recompute totals; keep it that way.

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
  payment/simulate/             # Dev-only payment simulator (handles ?type=subscription branch for membership flow)
  auth/callback/route.ts        # Supabase PKCE code exchange — confirmation/magic-link landing
  membership/page.tsx           # Public pricing page (3 tier cards, hybrid intro + grid layout)
  membership/checkout/[tier]/page.tsx  # Server component: validates tier, redirects signed-out to signup, creates Stripe Checkout Session, 307s to gateway URL
  members/checkout/success/     # page.tsx + CheckoutActivating.tsx — polls /api/members/me until activated then redirects to dashboard
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
  membership/checkout/          # POST creates subscription Checkout Session via getPaymentGateway()
  membership/portal/            # POST returns Customer Portal URL via gateway.createPortalSession (auth-gated)
  membership/pause/             # POST { action: 'pause' | 'resume' } self-serve pause; state-machine-guarded conditional UPDATE
  virtual-butler/               # Virtual task submission
  webhooks/payment-complete/    # One-off booking webhook handler
  webhooks/stripe/              # Stripe (and mock) subscription webhook receiver — signature-gated, dispatches to webhook-handler.ts

src/components/
  PlaceholderPage.tsx           # Shared shell for (legal) placeholder routes — throwaway scaffold
  landing/                      # Header, Hero, Footer (4-col / 9-link), HowItWorks, ButlerCategoryGrid
  booking/                      # BookingFlow, BookingForm, ServiceOptionSelector, PricedBookingForm
  membership/                   # TierBadge, UsageGauge, VirtualRequestForm, TierCard, TierComparison, PlanManager (7-variant settings panel)
  members/
    MembershipBanner.tsx        # Persistent banner for past_due / paused / pending-cancel; mounted from members/layout
    WelcomeBanner.tsx           # One-shot welcome card on ?welcome=1
  admin/                        # AdminTabs, MemberManager, ButlerContentEditor
  genie/                        # GenieDrawer, GenieStickyBar (persistent CTA)
  ui/                           # shadcn primitives

src/emails/
  membership/
    components/MembershipEmailLayout.tsx
    WelcomeEmail.tsx / RenewalReceiptEmail.tsx / PaymentFailedEmail.tsx /
    PauseConfirmedEmail.tsx / ResumeConfirmedEmail.tsx /
    CancellationScheduledEmail.tsx / CancellationFinalEmail.tsx /
    PlanChangedEmail.tsx
    admin/AdminEmailLayout.tsx
    admin/NewMemberNotification.tsx / PaymentFailedNotification.tsx /
    admin/PauseNotification.tsx / CancelScheduledNotification.tsx /
    admin/CancellationFinalNotification.tsx

src/data/                       # Static config
  services.ts                   # Service definitions
  booking-config.ts             # Booking options
  butler-page-configs.ts        # Butler page content
  butler-tasks.ts               # Task definitions per butler
  membership-config.ts          # Tier definitions (Lite/Frequent/Pro)
  pricing-config.ts             # Pricing rules
  content-schema.ts             # CMS content schema

src/lib/
  supabase/                     # client.ts, server.ts
  payment/                      # gateway.ts (provider pattern), mock-gateway.ts, stripe-gateway.ts (stub), types.ts (PaymentGateway + WebhookEvent union), webhook-handler.ts (5 handlers), booking-repository.ts (atomic hours decrement, dev singleton on globalThis), require-gateway-configured.ts (shared 500 guard for routes that hit the gateway)
  pricing/                      # calculate-price.ts (member-aware), time-slots.ts, booking-reference.ts
  membership/                   # membership-reader.ts (server-side read), period-rollover.ts (UIOLO), member-hours.ts (atomic decrement helper), tier-pricing.ts (Stripe price ID resolver)
                                #   lifecycle-transitions.ts      — Pure transition detection from webhook event + row diff
                                #   lifecycle-notifier.ts         — Orchestrator: idempotency log + Resend send + error handling
                                #   admin-recipient.ts            — MEMBERSHIP_ADMIN_NOTIFY_EMAIL → BOOKING_ADMIN_NOTIFY_EMAIL → ADMIN_EMAILS[0]
                                #   portal-snapshot.ts            — sessionStorage pre/post-portal snapshot + diff
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
- **Membership tiers:** Three tiers, Lite (£500, 10h / 5 tasks), Frequent (£1,000, 20h / 10 tasks), Pro (£2,500, 55h / 25 tasks), defined in `src/data/membership-config.ts`. Tier data stored in Supabase with RLS policies. DB CHECK constraints enforce usage limits.
- **Pricing:** `calculatePricePreview()` in `src/lib/pricing/calculate-price.ts` accepts `isMember`. Members pay flat `MEMBER_HOURLY_RATE` (£50) and are exempt from urgency multipliers; non-members get the butler's hourly rate × urgency multiplier. Budget Butler is £50/hr; Bespoke is "price upon consultation" (no displayed rate). All `/api/calculate-price` and booking-submit endpoints **re-derive `isMember` server-side** from the session — client-supplied totals are recomputed and rejected on mismatch.
- **UIOLO (use-it-or-lose-it):** Membership hours/tasks reset to tier max at calendar-month boundary. Implemented as a **lazy reset** in `src/lib/membership/period-rollover.ts` — applied on every read via `/api/members/me` and `useMembership()`. UK timezone via `src/lib/dates/today-uk.ts`. No cron; no schema change. Member bookings are gated on remaining hours and decrement atomically via `src/lib/membership/member-hours.ts`.
- **Admin:** Tabbed layout (`AdminTabs`) with content editor and member manager. Access controlled by email allowlist in `src/lib/admin.ts` and `admin_users` table (RLS policies reference this table).
- **Rate limiting:** In-memory per-IP rate limiting via `src/lib/rate-limit.ts` on public API endpoints (bookings, checkout, pricing, webhooks).
- **RLS:** Booking tables (priced_bookings, bespoke_consultations) are user-scoped SELECT only; all writes via service role. Membership tables scoped to user_id. Admin actions scoped to admin_users table.
- **Genie:** Sticky bottom bar + drawer CTA that appears after scrolling, used across butler pages.
- **Content system:** Static defaults in `src/data/` merged with Supabase-stored overrides via `src/lib/content.ts`.
- **Placeholder pages:** Nine footer routes live under `src/app/(legal)/` and share `src/components/PlaceholderPage.tsx` (charcoal bg, serif h1, italic subtitle). The component is throwaway — when a page gets real content, it stops using `PlaceholderPage` and gets its own JSX.
- **Supabase email links / auth callback:** Both `signUp()` call sites (`src/context/AuthContext.tsx`, `src/app/api/members/signup/route.ts`) pass `options.emailRedirectTo` so confirmation links point at the same origin the user signed up on (client uses `window.location.origin`; server uses `getSiteUrl(request)`). The link lands on `src/app/auth/callback/route.ts`, which calls `supabase.auth.exchangeCodeForSession(code)` and redirects to `?next=` (default `/members/dashboard`). The Supabase dashboard's **Site URL** is the fallback when `emailRedirectTo` is omitted or not in the Redirect URL allowlist — keep all deploy origins (`https://butlersinc.com`, `https://staging.butlersinc.com`, `http://localhost:3000`) in the allowlist as `…/auth/callback`.
- **Subscription checkout (Stripe-shaped, mock today):** Public `/membership` page → "Choose Lite" → `/membership/checkout/[tier]` (server component) → `/api/membership/checkout` resolves the price via `getTierPriceId(slug)` from `src/lib/membership/tier-pricing.ts` and calls `gateway.createSubscriptionCheckoutSession(...)`. Mock returns a `/payment/simulate?type=subscription&...` URL; future `StripeGateway` will return a real Stripe Checkout URL. `client_reference_id` carries the Supabase `user.id` through to the webhook. After payment the simulator POSTs a synthetic `checkout.session.completed` event to `/api/webhooks/stripe` with header `x-mock-signature: 1`, then the browser lands on `/members/checkout/success` which polls `/api/members/me` for ~10s until provisioning completes, then redirects to `/members/dashboard?welcome=1`.
- **Webhook-driven provisioning:** `/api/webhooks/stripe` is signature-gated (requires `stripe-signature` in stripe mode, `x-mock-signature` in mock mode), uses an exhaustive `switch` over the `WebhookEvent` discriminated union with TS `never` guard, dispatches to pure handler functions in `src/lib/payment/webhook-handler.ts`. Provisioning happens in the webhook, NOT in the success URL (per Stripe's recommendation). Idempotency, stale-event guard, admin-overlap UPSERT, and the `unpaid`/`incomplete_expired`/`incomplete` Stripe-status-to-app-status mapping all live in webhook-handler.ts and are unit-tested with real Stripe sample event JSON. The 5 events handled: `checkout.session.completed`, `customer.subscription.updated`/`.deleted`, `invoice.paid` (resets UIOLO, preserves paused state), `invoice.payment_failed` (→ `past_due`). **Known gap (subscriptions only):** `handleCheckoutCompleted` early-returns on `!d.subscription`, so a real-Stripe one-off booking (`mode: 'payment'`) `checkout.session.completed` is NOT provisioned via this path — one-off booking provisioning still flows through the mock-only `/api/webhooks/payment-complete`. `StripeGateway.createCheckoutSession`/`verifyPayment` are implemented and tested but their end-to-end real-Stripe wiring (branch `/api/webhooks/stripe` on `session.mode === 'payment'`) is a deliberate follow-up; keep one-off bookings on `PAYMENT_GATEWAY=mock` until then.
- **Payment gateway types:** Canonical `PaymentGateway` interface lives in `src/lib/payment/types.ts` (`src/lib/pricing/types.ts` re-exports for back-compat). `WebhookEvent` is a discriminated union; `CheckoutSessionData` has JSDoc explaining that some fields (period dates, line_items) are part of our envelope shape and the future Stripe adapter must populate them by retrieving the subscription. `pause_collection.behavior` is typed as the Stripe literal union (`'keep_as_draft' | 'mark_uncollectible' | 'void'`).
- **Mock vs Stripe gateways:** `getPaymentGateway()` in `src/lib/payment/gateway.ts` returns `MockPaymentGateway` when `PAYMENT_GATEWAY=mock` (default), `StripeGateway` when `=stripe`. `StripeGateway` is now **fully implemented** against the `stripe` SDK (pinned `apiVersion` `2026-05-27.dahlia`). It takes an optional `StripeLike` client (constructor injection for tests); production lazily builds the real client and throws if `STRIPE_SECRET_KEY` is unset. `parseWebhookEvent` does real `constructEvent` signature verification and normalizes raw Stripe events into the `WebhookEvent` envelope (item-level billing periods; pause_collection → status `paused`; invoice subscription via `parent.subscription_details`). Mock-mode guard: throws if `NODE_ENV=production` and `PAYMENT_GATEWAY=mock`. Rollout: mock locally, `stripe` + **test** keys on staging, live keys in production as a separate step.
- **Mock gateway verifyPayment by pattern:** `verifyPayment(sessionId)` accepts any `mock_session_*` ID via prefix match. Replay protection is at the DB layer: `booking_repository.findByCheckoutSession` returns null for unknown IDs (yields 404 at the webhook) and the webhook short-circuits with `already_processed` when `payment_status === 'paid'`. Gateway-level Set-based replay protection doesn't survive serverless instance boundaries.
- **DevBookingStore singleton on `globalThis`:** `getBookingRepository()` pins the dev in-memory store on `globalThis.__butlersDevStore` (not a module-level `let`) so the same instance is reused across route handlers in Next.js App Router dev mode. Without this, `/api/create-checkout-session` and `/api/webhooks/payment-complete` see different stores and bookings vanish between requests.
- **Route-level error JSON envelope:** `/api/create-checkout-session` and `/api/bookings` wrap their entire handler body in a try/catch that always returns JSON 500 with the underlying error message (also logged via `console.error`). Pairs with the client-side `readErrorMessage` helper in `BookingFlow.tsx` which falls back to `Failed (HTTP <status>)` when the response body isn't JSON. Prevents Safari's cryptic `JSON.parse → "The string did not match the expected pattern"` toast when an upstream throws synchronously.
- **Self-serve plan management (Phase B):** `src/components/membership/PlanManager.tsx` derives one of 7 view variants from the single `Membership` row (none / active-self / active-admin / pending-cancel / paused / past_due / cancelled). Portal actions (Manage / Reactivate / Update payment) hit `POST /api/membership/portal` which returns a Stripe Customer Portal URL; the browser navigates. Pause/Resume hit `POST /api/membership/pause` which calls the gateway, then writes the DB synchronously via a status-guarded conditional UPDATE (race-safe). Mock portal lives at `/payment/simulate-portal` (server component with `<form action={serverAction}>` buttons firing synthetic webhooks). Lazy UIOLO rollover in `readActiveMembership` is **skipped for Stripe-managed memberships** (those with `stripe_subscription_id`) — `invoice.paid` is the source of truth there; admin-created rows (sub_id NULL) keep the lazy rollover fallback. `hasSufficientMemberHours` blocks all non-active statuses (paused / past_due / cancelled all fall through to non-member pricing).
- **Lifecycle notifications:** Every membership webhook handler in `src/lib/payment/webhook-handler.ts` calls `notifyLifecycle(...)` after its DB write. Transition detection is a pure function in `src/lib/membership/lifecycle-transitions.ts` returning a discriminated `Transition` union. The notifier (`src/lib/membership/lifecycle-notifier.ts`) inserts into `lifecycle_email_log` first (composite PK `(event_id, transition, recipient)`); on conflict it skips the Resend send. Resend 5xx/network failures DELETE the log row so the next Stripe retry re-attempts; Resend 4xx (permanent) failures KEEP the row to prevent retry storms and log `lifecycle.email.permanent_failure`. Notifier errors are swallowed by each webhook handler's try/catch so DB-write correctness is never blocked on email plumbing.
- **Membership banner reach:** `<MembershipBanner />` is mounted in `src/app/members/layout.tsx`, so the past_due / paused / pending-cancel state is visible across every `/members/*` page, not only the settings page. `<WelcomeBanner />` (gated by `?welcome=1` + a localStorage flag) lives in the same layout, wrapped in `<Suspense>` because it uses `useSearchParams`.
- **Portal-return acknowledgement:** `PlanManager` calls `stashPortalSnapshot(membership)` before navigating to Stripe Portal; on return to `/members/settings`, the page calls `consumePortalSnapshot()` and diffs against current membership state to toast the specific change (plan_changed, cancel_scheduled, cancel_reversed, cancelled). If the webhook hasn't landed within ~5s, falls back to a generic info toast.

## Gotchas — do not "refactor" these

Counter-intuitive, load-bearing code. Each looks wrong or improvable but is deliberate. Changing it reintroduces a fixed bug.

- **Dev booking store is pinned to `globalThis.__butlersDevStore`, not a module-level `let`.** Module scope is not shared across route handlers in App Router dev mode, so a `let` makes bookings vanish between requests. Keep it on `globalThis`.
- **Mock `verifyPayment` accepts any `mock_session_*` by prefix; replay protection lives at the DB layer, not the gateway.** Gateway-level Set-based replay protection does not survive serverless instance boundaries. Do not "harden" the gateway with an in-memory seen-set.
- **Lifecycle notifier errors are swallowed by each webhook handler's try/catch.** This is intentional: DB-write correctness must never be blocked on email plumbing. Do not let notifier errors propagate.
- **Lazy UIOLO rollover is skipped for Stripe-managed memberships (`stripe_subscription_id` present).** `invoice.paid` is the source of truth there; admin-created rows (sub_id NULL) keep the lazy fallback. Do not re-enable lazy rollover for Stripe rows.
- **`/api/create-checkout-session` and `/api/bookings` wrap the whole handler in try/catch that always returns JSON 500.** This pairs with `readErrorMessage` in `BookingFlow.tsx` to avoid Safari's cryptic `JSON.parse` toast on a synchronous upstream throw. Do not remove the envelope or return a non-JSON error.
- **`StripeGateway.parseWebhookEvent` deliberately reads billing periods from `subscription.items.data[0]`, not the subscription root, and maps `pause_collection` to status `paused`.** In the pinned API version (`2026-05-27.dahlia`) periods live on items, and Stripe leaves status `active` when paused via `pause_collection`. Reading the root or passing status through verbatim reintroduces fixed bugs (zeroed periods; self-serve pause reconciled back to active by the webhook).

## Bug Resolution Log

Before debugging an issue, check `docs/bug-resolution-log.md` for previously resolved bugs — it may contain relevant root causes or patterns. After resolving a significant bug, add an entry with the symptom, root cause, fix, and lesson learned.

## Maintaining This File

After implementing a major feature, new route, or architectural change, update this file to reflect it. Specifically:
- New pages/routes → update Architecture tree
- New component directories → update Architecture tree
- New env vars → update Environment Variables list
- New data files or config → update Architecture tree
- New patterns or conventions → update Key Patterns or Key Conventions

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
| ------ | ---------- |
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.
