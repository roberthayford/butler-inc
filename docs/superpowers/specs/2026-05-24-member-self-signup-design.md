# Member self-signup — public pricing page + Stripe-shaped subscription flow (Design)

**Date:** 2026-05-24
**Author:** Rob Hayford (paired with Claude)
**Brief reference:** No formal brief section — closes the gap surfaced after the C-rate spec landed (PR #17): members exist as a concept but only admin can create them.
**Status:** Phase A SHIPPED (PR #20, merged to staging 2026-05-24). Phase B not started.

## Implementation status

| Slice | Status | Notes |
|---|---|---|
| **Phase A — funnel + provisioning** | ✅ SHIPPED on staging | Public `/membership` page, Stripe-shaped subscription checkout (mock today, `StripeGateway` stub for later), webhook-driven provisioning, dashboard upsell, Header "Join" → `/membership`, signup `?next=` honoring, DB migrations 007 + 008. Sub-skills: Set-based mock replay protection removed (DB layer instead), DevBookingStore singleton on `globalThis`, route-level JSON error envelope, em-dash sweep across copy. |
| **Phase B — self-serve** | ⏳ TODO | `PlanManager` on `/members/settings`, `/api/membership/portal` (Stripe Customer Portal for cancel + plan-swap + payment-method update), `/api/membership/pause` (custom because portal doesn't support pause), mock portal simulator. See "Self-serve actions" section below for the full breakdown. |
| **Real Stripe wiring** | ⏳ Deferred | Wait until Phase B is done. The 7 `StripeGateway` stub methods become the implementation checklist. |
| **Tier values + rename** | ⏳ Blocked on Faridah | Proposed £500/£1k/TBC and Lite/Frequent/Daily; current code uses £49/£99/£199 and Lite/Essential/Heavy. Single `MEMBERSHIP_TIERS` edit + DB migration when locked. |

## Why

Today the only path to becoming a member is:

1. User signs up for an account at `/members/signup` (creates a Supabase auth user, **no membership row**)
2. Admin opens `/admin` → MemberManager → "Create Membership" → picks tier + sets hours/period manually
3. Payment is collected out-of-band, if at all

There is no public pricing page, no self-serve tier selection, no checkout, no way for a member to change/pause/cancel their plan without admin intervention. The C-rate work (flat £50 member rate, UIOLO rollover, atomic hours decrement) shipped a working *membership runtime* with no *membership funnel* feeding it.

This spec adds the funnel: a public `/membership` page, a Stripe-shaped subscription checkout (mock today, real Stripe later as a focused swap PR), webhook-driven provisioning, and self-serve plan management via Stripe Customer Portal (cancel / upgrade / downgrade / update card) plus custom pause/resume.

## Decisions locked

| Decision | Choice | Why |
|---|---|---|
| Payment scope | Stripe-shaped flow against existing `PaymentGateway` interface; mock today, real Stripe later | Unblocks UI/flow work; the existing mock gateway already returns a `verified` flag and we can extend it to fake subscription lifecycle |
| Funnel entry | Public `/membership` page; header "Join" → `/membership` (not `/members/signup`) | Standard SaaS pattern; visitors can compare before committing; SEO-friendly |
| Self-serve actions | Subscribe from dashboard, upgrade/downgrade, cancel, pause | Full self-serve; admin override stays for edge cases |
| Trial policy | None — charge immediately | Cleanest billing, simplest copy, no day-N abandonment risk |
| Tier value posture | Ship with current £49/£99/£199; tier definitions are config-driven so Faridah can change them later | Don't block on Faridah's pending £500/£1k decisions |
| Provisioning source of truth | Stripe webhooks (Stripe's explicit recommendation) | Success URL just shows "Activating…" and polls; webhook does the DB write |
| Cancel / plan-swap / payment-method UI | Stripe Customer Portal (hosted by Stripe) | Avoids building 3 custom UIs; Stripe handles deflection, 3DS, card validation |
| Pause UI | Custom in our `/members/settings` (calls `pause_collection`) | Customer Portal does not support pause |

## Stripe research summary (verified 2026-05-24 against current docs)

- **Provisioning:** *"After the subscription signup succeeds, the customer returns to your website at the success_url, which initiates a `checkout.session.completed` webhook. When you receive a checkout.session.completed event, use entitlements to provision the subscription."* — Stripe docs. We provision in the webhook, not the success handler.
- **Minimum webhook events:** `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed` (Stripe's minimum set). We additionally listen for `customer.subscription.updated` and `customer.subscription.deleted` for plan-change and cancellation lifecycle.
- **Customer Portal support matrix:** cancel ✅, plan switch ✅ (max 10 products — we have 3), payment method update ✅, **pause ❌**. Portal is hosted-only — full-page redirect, cannot be iframed.
- **Pause:** `pause_collection.behavior` accepts `keep_as_draft`, `mark_uncollectible`, or `void`. We use `mark_uncollectible`. Note: `pause_collection` only stops billing; we layer our own `memberships.status='paused'` on top so the booking gate also revokes member pricing during the pause.
- **Linking user_id:** `client_reference_id` on the Checkout Session (max 200 chars, set to our Supabase `user.id`).

## Architecture & funnel

```
PUBLIC                                        AUTHED MEMBER
─────────────────────────────────             ──────────────────────────
 / → Hero CTA "Become a member"               /members/dashboard
 /membership ★ NEW                              ├─ No membership row?
   3 tier cards (Lite/Essential/Heavy)         │  Show "Choose a plan" → /membership
   ↓ "Choose Lite"                             ├─ Has membership?
   ↓ (if signed-out: /members/signup           │    Usage gauges + tier
       ?next=/membership/checkout/lite)        │    "Manage plan" → /members/settings
   ↓
 /membership/checkout/[tier] ★ NEW            /members/settings ★ EXPANDED
   ↓ POST /api/membership/checkout              Plan section:
   ↓ gateway.createSubscriptionCheckoutSession  ├─ "Manage subscription in Stripe"
   ↓ redirect → Stripe Checkout (or mock)      │   → POST /api/membership/portal
   ↓                                            │   → Stripe Customer Portal (hosted)
 Payment OK → /members/checkout/success?       │     - Cancel
   session_id=… ★ NEW                          │     - Change tier
   ↓ <CheckoutActivating /> polls              │     - Update card
   ↓ /api/members/me until membership active   │
   ↓                                            └─ "Pause membership" → custom UI
 /members/dashboard?welcome=1                       POST /api/membership/pause
                                                    gateway.pauseSubscription(subId)
                                                    + memberships.status='paused'

WEBHOOK (provisioning source of truth)
──────────────────────────────────────
 /api/webhooks/stripe ★ NEW
   - Verifies Stripe signature (or mock-trusted body in dev)
   - checkout.session.completed   → INSERT memberships row
   - customer.subscription.updated → sync tier / cancel_at_period_end / pause state
   - customer.subscription.deleted → status='cancelled'
   - invoice.paid                 → extend period, reset UIOLO
   - invoice.payment_failed       → status='past_due'
```

The pricing page layout is **A's three-up grid + C's intro paragraph** (decided during brainstorming):

- Serif h1 "Become a member"
- Italic serif intro paragraph explaining the flat £50/hr rate and monthly allowance
- Three small bullet "eyebrows" centred (Same rate, No urgency surcharges, Hours reset monthly)
- Three equal-weight tier cards with full brass CTAs on each (no "Most Popular" badge — confident, restrained)
- Quiet footer reassurance: "Cancel, upgrade, or pause anytime"

## What changes

### New pages

| Route | Notes |
|---|---|
| `/membership` | Public pricing page (3 tiers, hybrid layout) |
| `/membership/checkout/[tier]` | Server component: creates Checkout Session, 307s to gateway URL |
| `/members/checkout/success` | "Activating…" spinner; polls `/api/members/me` until status='active' (10s timeout fallback) |

### Modified pages

| File | Change |
|---|---|
| `src/components/landing/Header.tsx` | "Join" CTA → `/membership` (was `/members/signup`) |
| `src/app/page.tsx` | Add (or rename existing) hero CTA pointing at `/membership` — exact placement decided during implementation by reading current hero copy |
| `src/app/members/dashboard/page.tsx` | Shows "Choose a plan" card when no membership row |
| `src/app/members/settings/page.tsx` | New "Plan" section: `<PlanManager />` |
| `src/app/members/signup/SignupPage.tsx` | Honour `?next=` query param → redirect after email confirm |

### New API routes

| Route | Body | Notes |
|---|---|---|
| `POST /api/membership/checkout` | `{ tier }` | Auth-gated; creates subscription Checkout Session; returns `{ url }` |
| `POST /api/membership/portal` | `{ returnUrl? }` | Auth-gated; requires existing `stripe_customer_id`; returns `{ url }` |
| `POST /api/membership/pause` | `{ action: 'pause' \| 'resume' }` | Auth-gated; status-machine validated |
| `POST /api/webhooks/stripe` | Stripe event JSON | Signature-gated; idempotent; routes to `webhook-handler` |

### New components

| File | Purpose |
|---|---|
| `src/components/membership/TierCard.tsx` | One pricing card (price, hours, tasks, CTA) — reused on `/membership` and on dashboard "Choose a plan" upsell |
| `src/components/membership/TierComparison.tsx` | 3-up TierCard grid for `/membership` |
| `src/components/membership/PlanManager.tsx` | Settings panel: state-driven Manage / Pause / Resume buttons |
| `src/components/membership/CheckoutActivating.tsx` | Polling spinner used by `/members/checkout/success` |

### New lib code

| File | Purpose |
|---|---|
| `src/lib/payment/types.ts` | Move `PaymentGateway` interface here; add subscription/portal/pause methods + `WebhookEvent` discriminated union |
| `src/lib/payment/mock-gateway.ts` | EXTEND: in-memory subscription state, portal sim, synthetic webhook emission |
| `src/lib/payment/stripe-gateway.ts` | NEW stub: every method throws `"StripeGateway not yet implemented"` — fully tested contract for the future real implementation |
| `src/lib/payment/webhook-handler.ts` | NEW: pure functions per event type (`handleCheckoutCompleted`, `handleSubscriptionUpdated`, `handleSubscriptionDeleted`, `handleInvoicePaid`, `handleInvoicePaymentFailed`) |
| `src/lib/membership/tier-pricing.ts` | NEW: `getTierPriceId(slug)` reads from env (`STRIPE_PRICE_LITE`, etc.); falls back to mock IDs (`mock_lite`) in dev |

### New dev-only pages

| File | Purpose |
|---|---|
| `src/app/payment/simulate-portal/page.tsx` | Mock Customer Portal: Cancel / Change Plan / Update Card buttons that fire synthetic webhooks |
| `src/app/payment/simulate/page.tsx` (EXTEND) | Handle `?type=subscription` to simulate `checkout.session.completed` |

### Database migration

```sql
-- supabase/migrations/<timestamp>_membership_subscriptions.sql

ALTER TABLE memberships
  ADD COLUMN stripe_customer_id text UNIQUE,
  ADD COLUMN stripe_subscription_id text UNIQUE,
  ADD COLUMN cancel_at_period_end boolean NOT NULL DEFAULT false,
  ADD COLUMN paused_at timestamptz;

-- Extend status enum to include past_due (existing values: active, paused, cancelled)
ALTER TABLE memberships
  DROP CONSTRAINT IF EXISTS memberships_status_check;
ALTER TABLE memberships
  ADD CONSTRAINT memberships_status_check
  CHECK (status IN ('active', 'paused', 'cancelled', 'past_due'));

-- Index for webhook lookups by Stripe IDs
CREATE INDEX idx_memberships_stripe_subscription_id ON memberships(stripe_subscription_id);
CREATE INDEX idx_memberships_stripe_customer_id ON memberships(stripe_customer_id);
```

A follow-up migration `008_membership_uniqueness.sql` widens the partial unique index `idx_memberships_one_active_per_user` from `WHERE status='active'` to `WHERE status IN ('active', 'past_due')` so the "one membership per user" invariant covers `past_due` rows (closes a gap surfaced during Phase A code review).

#### Production deployment note (lock duration)

Both migrations 007 and 008 use statements that acquire **ACCESS EXCLUSIVE** on the `memberships` table:

- `ALTER TABLE ... ADD COLUMN ... UNIQUE` (007): each UNIQUE column adds an implicit B-tree index built under ACCESS EXCLUSIVE, scanning every existing row.
- `ALTER TABLE ... ADD CONSTRAINT ... CHECK (...)` (007): validates the constraint against every existing row, also under ACCESS EXCLUSIVE.
- `DROP INDEX ... ; CREATE UNIQUE INDEX ...` (008): the create scans every row in the partial set under ACCESS EXCLUSIVE.

On a small table (Phase A launch, dozens of members) this completes in milliseconds and is irrelevant. **On a larger table**, the same migrations queue every concurrent read/write behind a multi-second lock, which on a live site is a partial outage window.

Mitigation when the table is large enough to matter (deferred until needed):

1. Run inside a maintenance window.
2. Or use the concurrent pattern: add columns as nullable non-unique first, `CREATE UNIQUE INDEX CONCURRENTLY`, then `ADD CONSTRAINT ... USING INDEX`. CHECK constraint rebuilds can be split into `NOT VALID` + later `VALIDATE CONSTRAINT` (which only acquires SHARE UPDATE EXCLUSIVE).

No code change required today; this note exists so the next person touching `memberships` doesn't repeat the pattern on a hot table.

Admin-created memberships keep working — `stripe_customer_id` and `stripe_subscription_id` are nullable. Self-serve actions (Manage / Pause / Resume) hide their buttons when `stripe_subscription_id IS NULL`, since those members were provisioned by admin and don't have a Stripe subscription to act on.

### Environment variables (Vercel per-env)

| Variable | Production | Preview | Local |
|---|---|---|---|
| `PAYMENT_GATEWAY` | `stripe` (later) | `mock` | `mock` |
| `STRIPE_SECRET_KEY` | live key (later) | test key (when real Stripe lands) | unset |
| `STRIPE_WEBHOOK_SECRET` | from Stripe Dashboard (later) | from Stripe Dashboard (later) | unset |
| `STRIPE_PRICE_LITE` | `price_xxx` (later) | `price_xxx_test` (later) | unset (mock falls back to `mock_lite`) |
| `STRIPE_PRICE_ESSENTIAL` | `price_xxx` (later) | `price_xxx_test` (later) | unset |
| `STRIPE_PRICE_HEAVY` | `price_xxx` (later) | `price_xxx_test` (later) | unset |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | live publishable (later) | test publishable (later) | unset |

Until real Stripe is wired, `PAYMENT_GATEWAY=mock` everywhere except prod (which throws on subscription attempts — same guard as existing one-off mock gateway).

## Gateway interface — additions

```ts
// src/lib/payment/types.ts
export interface PaymentGateway {
  // existing
  createCheckoutSession(req: CheckoutSessionRequest): Promise<CheckoutSessionResult>;
  verifyPayment(sessionId: string): Promise<{ verified: boolean; paymentIntentId?: string }>;

  // new (subscriptions)
  createSubscriptionCheckoutSession(req: {
    tier: TierSlug;
    priceId: string;
    userId: string;          // → Stripe client_reference_id
    customerEmail: string;
    successUrl: string;      // {origin}/members/checkout/success?session_id={CHECKOUT_SESSION_ID}
    cancelUrl: string;       // {origin}/membership
  }): Promise<{ url: string; sessionId: string }>;

  createPortalSession(req: {
    customerId: string;
    returnUrl: string;       // {origin}/members/settings
  }): Promise<{ url: string }>;

  pauseSubscription(subscriptionId: string): Promise<void>;
  resumeSubscription(subscriptionId: string): Promise<void>;

  parseWebhookEvent(rawBody: string, signature: string | null): Promise<WebhookEvent>;
}

export type WebhookEvent =
  | { type: "checkout.session.completed"; data: CheckoutSessionData }
  | { type: "customer.subscription.updated"; data: SubscriptionData }
  | { type: "customer.subscription.deleted"; data: SubscriptionData }
  | { type: "invoice.paid"; data: InvoiceData }
  | { type: "invoice.payment_failed"; data: InvoiceData }
  | { type: "unhandled"; rawType: string };
```

## Data flows

### Subscribe — happy path

1. User clicks "Choose Lite" on `/membership`
2. `/membership/checkout/lite` server component reads session, calls `gateway.createSubscriptionCheckoutSession({ tier: 'lite', priceId: getTierPriceId('lite'), userId, customerEmail, successUrl, cancelUrl })`
3. Returns 307 → gateway URL (Stripe Checkout or mock simulator)
4. User completes payment
5. Gateway POSTs `checkout.session.completed` to `/api/webhooks/stripe`
6. Webhook verifies signature, parses event, calls `handleCheckoutCompleted(event, supabase)`:
   - Look up user via `client_reference_id`
   - **UPSERT rule** (handles three cases idempotently):
     - If a row with the event's `stripe_subscription_id` already exists → no-op (idempotent replay).
     - Else if the user has an active membership row with NULL `stripe_subscription_id` (admin-created) → UPDATE that row to attach the Stripe IDs, refresh tier/hours/period from event. Do not duplicate.
     - Else INSERT a fresh row (status='active', tier_id, stripe_customer_id, stripe_subscription_id, period from invoice).
   - Return 200
7. Gateway also redirects browser → `/members/checkout/success?session_id=…`
8. `<CheckoutActivating />` polls `/api/members/me` every 800ms (up to ~12 polls, hard cap 10s); once `membership.status === 'active'`, `router.push('/members/dashboard?welcome=1')`
9. After 10s with no active membership: render "Taking longer than usual — your membership should appear shortly" with a "Go to dashboard" link (webhook will catch up in the background)

### Self-serve actions

**⏳ Phase B — not yet implemented.** Routes (`/api/membership/portal`, `/api/membership/pause`), mock portal simulator page (`/payment/simulate-portal`), and the `PlanManager` settings panel are not in the Phase A PR. Mock gateway already has `createPortalSession` + `pauseSubscription`/`resumeSubscription` stubs, so the contract is in place; Phase B wires the routes + UI on top.

- **Manage / Cancel / Plan-swap / Update card** → `POST /api/membership/portal` → `gateway.createPortalSession({ customerId, returnUrl })` → 307 → portal → user does stuff → returns to settings → webhooks sync DB asynchronously.
- **Pause** → `POST /api/membership/pause { action: 'pause' }` → `gateway.pauseSubscription(subId)` (sets Stripe `pause_collection.behavior='mark_uncollectible'`) + `UPDATE memberships SET status='paused', paused_at=now()`. Booking gate (existing `hasSufficientMemberHours`) already checks `status='active'` → paused members revert to non-member pricing automatically.
- **Resume** → `POST /api/membership/pause { action: 'resume' }` → `gateway.resumeSubscription(subId)` + `UPDATE memberships SET status='active', paused_at=null`. Next `invoice.paid` webhook extends period + resets UIOLO.

## Mock gateway behavior

- `createSubscriptionCheckoutSession` → returns `url: /payment/simulate?type=subscription&sid=...&tier=...&user_id=...`
- Simulator "Approve" POSTs synthetic `checkout.session.completed` to `/api/webhooks/stripe` with header `x-mock-signature: 1` (no real Stripe signature)
- Webhook route: if `PAYMENT_GATEWAY=mock` AND `x-mock-signature` header present, skip Stripe signature verification and parse body as JSON. In any other case require valid `stripe-signature` header and fail closed (400, no DB writes).
- `createPortalSession` → `/payment/simulate-portal?customer_id=…` (page with Cancel / Change Plan / Update Card buttons that each fire matching synthetic webhooks)
- `pauseSubscription` / `resumeSubscription` → flip in-memory state, emit synthetic `customer.subscription.updated`

## TDD plan

Per `/test-driven-development`: every new file gets a failing test first, then implementation. Write tests in this order (highest leverage first):

**Layer 1 — pure functions:**
- `src/lib/payment/__tests__/webhook-handler.test.ts` — one describe per event type, using real Stripe sample event JSON as fixtures. Cover happy-path provisioning, **idempotency** (same event twice = same end state), **stale-event guard** (older `event.created` than row `updated_at` → no-op), **admin-overlap** (webhook for user with admin-created row updates not duplicates).
- `src/lib/membership/__tests__/tier-pricing.test.ts` — env resolution, mock fallback, throws on unknown slug.

**Layer 2 — gateway contract:**
- Extend `src/lib/payment/__tests__/mock-gateway.test.ts` with subscription/portal/pause coverage + `parseWebhookEvent` mock-mode acceptance.
- New `src/lib/payment/__tests__/stripe-gateway.test.ts` — every method throws `"not yet implemented"`. Documents the contract for the future real implementation.

**Layer 3 — API routes** (same `NextRequest`/`NextResponse` mock pattern as `/auth/callback`):
- `api/membership/checkout/__tests__/route.test.ts`
- `api/membership/portal/__tests__/route.test.ts`
- `api/membership/pause/__tests__/route.test.ts`
- `api/webhooks/stripe/__tests__/route.test.ts` — **signature gate behaviour** is the key test: in mock mode accepts `x-mock-signature: 1`; in stripe mode requires valid `stripe-signature` and 400s otherwise.

**Layer 4 — UI components:**
- `TierCard.test.tsx`, `TierComparison.test.tsx` — config-driven render, correct CTA href.
- `PlanManager.test.tsx` — render matrix across all five membership states (none / active / paused / cancelled / past_due).
- `CheckoutActivating.test.tsx` — polling cadence and timeout fallback using `vi.useFakeTimers()`.

**Layer 5 — touch-ups to existing tests:**
- `useMembership.test.tsx`, `membership-reader.test.ts`, `member-hours.test.ts` — extend status coverage to `past_due`; assert paused members lose member pricing.

## Verification

- `npm run test:run` — current 369 → target ~440-460 passing, 0 failing.
- `npm run lint` — zero new errors/warnings (5 errors / 12 warnings unchanged, all pre-existing).
- Browser walks on staging (still mock-gated, not real Stripe):
  1. **New subscription:** fresh account → `/membership` → "Choose Lite" → mock checkout approve → land on `/members/dashboard?welcome=1` with active Lite membership + 5h available.
  2. **Plan change via portal:** `/members/settings` → "Manage subscription" → mock portal → "Change to Essential" → return → confirm tier badge + hours updated after webhook fires.
  3. **Cancel via portal:** mock portal → "Cancel subscription" → settings shows "Cancels on DD-MMM" → portal "Reactivate" → status returns to active.
  4. **Pause:** settings → "Pause membership" → status='paused' → `/butlers/busy` → book → confirm **non-member pricing** is shown. Resume → confirm member pricing returns.
  5. **Webhook idempotency:** replay the same `checkout.session.completed` event twice via the mock simulator → second one is a no-op (no duplicate row, no extra hours).

## What this does NOT do (deferred)

- **Real Stripe wiring** — `StripeGateway` ships as a stub throwing "not yet implemented"; the actual Stripe SDK integration is a separate, focused PR once a Stripe account + price IDs + webhook secret exist. The contract is fully tested today so the future PR's diff is mechanical.
- **Tier value changes** (£500 / £1k / TBC) — still blocked on Faridah; this spec ships with current £49/£99/£199 values, swappable via single `MEMBERSHIP_TIERS` edit + DB migration when she locks new numbers.
- **Tier rename** (Lite / Frequent / Daily) — same as above.
- **Coupon / promo code support** at checkout — Stripe Checkout supports it natively (`allow_promotion_codes: true`); we can flip the flag when Faridah wants codes.
- **Annual billing toggle** — monthly only for v1. Adding annual is a second price ID per tier + a billing-period toggle on the pricing page.
- **Multi-tenant / team memberships** — single-user only.
- **Past-due dunning emails** — `invoice.payment_failed` webhook sets `status='past_due'`; we don't send our own notification (Stripe's built-in Smart Retries + their own dunning email is enough for v1).
- **Member welcome email** — out of scope; can be a Resend template fired by the webhook handler later.

## Branch + PR

- Branch: `feat--member-self-signup` off `staging` (already created).
- Single PR back to `staging` when complete.
- **Never merged to `main`** — standing rule.
- Likely needs a follow-up PR for the real Stripe wiring (deferred above).

## Alternatives considered

- **Webhook-driven from day 1 vs success-handler-driven** — chose webhook-driven because Stripe's current docs explicitly recommend it, and the mock gateway can simulate webhook delivery cheaply.
- **Custom in-app card form (Stripe Elements)** — rejected. Significantly more implementation work (PCI scope grows, 3DS handling, wallet support, fraud rules) for a 3-tier membership product. Stripe Checkout's hosted UI is the better trade.
- **Custom Cancel / Plan-swap / Update-card UIs** — rejected. Stripe Customer Portal handles all three out of the box (with deflection coupons, reason capture, 3DS, etc.); building custom would be reinventing well-trodden ground for no gain.
