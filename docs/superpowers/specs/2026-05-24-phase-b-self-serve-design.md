# Phase B — self-serve plan management (Design)

**Date:** 2026-05-24
**Author:** Rob Hayford (paired with Claude)
**Builds on:** [Phase A spec](2026-05-24-member-self-signup-design.md) — Phase A shipped funnel + provisioning; Phase B ships the self-serve management half.
**Status:** Design approved, spec written, plan TODO.

## Why

Phase A made it possible to *become* a member. Phase B makes it possible to *manage* membership without admin intervention: pause, resume, cancel, upgrade/downgrade, update card. Without Phase B, every plan change still requires a human at hello@butlersinc.com.

The contracts to do this work already exist on `staging`: the `PaymentGateway` interface exposes `createPortalSession`, `pauseSubscription`, `resumeSubscription`; the webhook handler dispatches `customer.subscription.updated` and `customer.subscription.deleted` correctly; `memberships` already has `stripe_subscription_id`, `cancel_at_period_end`, `paused_at`, and the `past_due` status from Phase A migrations 007 + 008. Phase B is purely additive on top of those seams: two new API routes, one new settings-page panel, one dev-only mock simulator, and tests.

## Prerequisite — tier rename + reprice PR

Phase B uses tier slugs `lite`, `frequent`, `pro` and prices £500 / £1000 / £2500. A small, focused PR ships **before** Phase B to apply these changes. Scope:

- `MEMBERSHIP_TIERS` config edit in `src/data/membership-config.ts` (rename `essential` → `frequent`, `heavy` → `pro`; new prices).
- DB migration: rename `essential` / `heavy` slugs in `memberships.tier_id` for existing rows.
- Stripe price-ID env-var rename: `STRIPE_PRICE_ESSENTIAL` → `STRIPE_PRICE_FREQUENT`, `STRIPE_PRICE_HEAVY` → `STRIPE_PRICE_PRO`.
- Update `getTierPriceId()` in `src/lib/membership/tier-pricing.ts`.
- Update copy on `/membership`, `TierCard`, `TierComparison`, dashboard, admin panel — anywhere the old names appear.
- Hours/tasks allowance per tier — **TBD by Faridah**; documented as the blocker before the prereq PR can land.

The Phase B spec assumes the prereq has landed. All references below use the new slugs/prices/names.

## Decisions locked (Phase B)

| Decision | Choice | Rationale |
|---|---|---|
| `/api/membership/pause` write semantics | Synchronous DB write **after** gateway success; conditional UPDATE guarded by expected current status | Booking gate reads `status='active'` synchronously, so pause must take effect immediately. Webhook stays as idempotent reconciliation. |
| Admin-created members (no `stripe_subscription_id`) UI | Read-only summary + "Contact hello@butlersinc.com" footer line, no buttons | Honest, dead-simple, no extra flow to maintain |
| `past_due` PlanManager UI | Red alert + "Update payment method" CTA (Portal); other buttons hidden; tier/hours shown as "suspended" | Single clear path to resolution |
| Cancellation phases | Distinct UI per phase: pending-cancel (yellow, Reactivate via Portal) vs cancelled (grey, Subscribe again link) | Preserves Reactivate path while sub is still active in the period |
| Mock portal fidelity | Minimum: 5 plain buttons that fire synthetic webhooks | Throwaway dev tool; real Stripe Portal replaces it later |
| Pause + UIOLO | Hours preserved through pause; UIOLO rollover skipped while `status != 'active'`; next reset happens at next `invoice.paid` after resume | Industry-standard pattern (Audible, ClassPass, Peloton); resuming users get what they paid for, no more, no less |
| `past_due` booking gate | Existing Phase A behaviour: non-member pricing applies; no hard block | Service business pattern (vs digital subscriptions that block entirely); keeps the booking door open at full price |
| Production-safety guard on new routes | Lift Phase A's webhook guard into shared `requireGatewayConfigured()` helper; reuse on all three callsites | Avoids drift; small, focused refactor |
| State-machine guard error code | 409 `invalid_transition` on disallowed pause/resume; 422 `no_subscription` for admin-created / cancelled / missing rows | 409 = conflict with current state; 422 = state-makes-action-meaningless |

## Architecture & file inventory

### New files

| File | Purpose |
|---|---|
| `src/components/membership/PlanManager.tsx` | Settings-page panel; renders one of 7 view variants per state |
| `src/components/membership/__tests__/PlanManager.test.tsx` | State-matrix render coverage |
| `src/app/api/membership/portal/route.ts` | POST; auth-gated; returns `{ url }` for Customer Portal |
| `src/app/api/membership/portal/__tests__/route.test.ts` | |
| `src/app/api/membership/pause/route.ts` | POST `{ action: 'pause' \| 'resume' }`; auth-gated; state-machine-guarded; synchronous DB write after gateway success |
| `src/app/api/membership/pause/__tests__/route.test.ts` | |
| `src/app/payment/simulate-portal/page.tsx` | Dev-only mock portal: 5 buttons that fire synthetic webhooks |
| `src/lib/payment/require-gateway-configured.ts` | Shared guard helper: returns 500 if `PAYMENT_GATEWAY` unset |
| `src/lib/payment/__tests__/require-gateway-configured.test.ts` | |

### Modified files

| File | Change |
|---|---|
| `src/app/members/settings/page.tsx` | New "Plan" section above existing profile section; renders `<PlanManager />` |
| `src/lib/payment/mock-gateway.ts` | Extend `createPortalSession` to return `/payment/simulate-portal?...`; verify `pauseSubscription`/`resumeSubscription` emit synthetic `customer.subscription.updated` |
| `src/lib/payment/__tests__/mock-gateway.test.ts` | Portal URL + pause/resume synthetic-event coverage |
| `src/lib/payment/webhook-handler.ts` | Verify `customer.subscription.updated` correctly handles cancel_at_period_end toggle + paused state transitions; smallest fix if gap surfaces |
| `src/lib/payment/__tests__/webhook-handler.test.ts` | Add cancel/reactivate/pause/resume sync coverage |
| `src/lib/membership/period-rollover.ts` | Add early-return when `status !== 'active'`; UIOLO does not run on paused / past_due / cancelled rows |
| `src/lib/membership/__tests__/period-rollover.test.ts` | Assert paused row with stale `period_start` reads back unchanged |
| `src/app/api/webhooks/stripe/route.ts` | Drive-by: replace inline guard with `requireGatewayConfigured()` call |
| `CLAUDE.md` | Add new routes/components/lib file to Architecture tree; add Phase B Key Patterns; mark Phase B SHIPPED on the Phase A spec status header |

### No DB migration

Phase A migrations 007 + 008 already cover everything Phase B needs.

### No new env vars

Phase A added `PAYMENT_GATEWAY` and the deferred `STRIPE_*` set. The prereq tier-rename PR renames two of them (`STRIPE_PRICE_ESSENTIAL` → `STRIPE_PRICE_FREQUENT`, `STRIPE_PRICE_HEAVY` → `STRIPE_PRICE_PRO`); Phase B itself adds none.

## PlanManager state machine

The membership row determines which of 7 view variants renders. State derivation is a pure function in `PlanManager.tsx`; the view layer is a switch on the derived state.

### State derivation

```ts
type PlanView =
  | { kind: 'none' }
  | { kind: 'active-admin'; tier; hoursLeft; renewsAt }       // sub_id IS NULL
  | { kind: 'active-self'; tier; hoursLeft; renewsAt; subId } // happy path
  | { kind: 'pending-cancel'; tier; hoursLeft; endsAt; subId }
  | { kind: 'paused'; tier; pausedAt; subId }
  | { kind: 'past_due'; tier; subId }
  | { kind: 'cancelled'; tier; endedAt };

function derivePlanView(m: Membership | null): PlanView {
  if (!m) return { kind: 'none' };
  if (m.status === 'cancelled')    return { kind: 'cancelled', tier: m.tier, endedAt: m.current_period_end };
  if (m.status === 'paused')       return { kind: 'paused', tier: m.tier, pausedAt: m.paused_at, subId: m.stripe_subscription_id };
  if (m.status === 'past_due')     return { kind: 'past_due', tier: m.tier, subId: m.stripe_subscription_id };
  // status === 'active' below
  if (m.stripe_subscription_id == null) return { kind: 'active-admin', tier: m.tier, hoursLeft: m.hours_remaining, renewsAt: m.current_period_end };
  if (m.cancel_at_period_end)           return { kind: 'pending-cancel', tier: m.tier, hoursLeft: m.hours_remaining, endsAt: m.current_period_end, subId: m.stripe_subscription_id };
  return { kind: 'active-self', tier: m.tier, hoursLeft: m.hours_remaining, renewsAt: m.current_period_end, subId: m.stripe_subscription_id };
}
```

### Render matrix

| Variant | Headline | Body / facts | Actions |
|---|---|---|---|
| `none` | "Choose a plan" | "You don't have an active membership yet." | `[ View plans → ]` to `/membership` |
| `active-admin` | "Plan: {Tier}" | Tier, hours/period, "Renews on DD MMM 2026" + "Your membership was set up by Butlers Inc directly. To change, pause, or cancel, contact hello@butlersinc.com." | None |
| `active-self` (happy) | "Plan: {Tier}" | Tier, hours used / total, "Renews on DD MMM 2026" | `[ Manage subscription → ]` (Portal) + `[ Pause membership ]` (custom) |
| `pending-cancel` | "Cancellation scheduled" (yellow notice) | "Your {Tier} membership cancels on DD MMM 2026. You can still use your remaining Xh until then." | `[ Reactivate subscription → ]` (Portal) |
| `paused` | "Membership paused" (yellow notice) | "Paused on DD MMM. Billing is suspended. Member pricing is not available until you resume." | `[ Resume membership ]` (custom) + `[ Manage subscription → ]` (Portal) |
| `past_due` | "We couldn't charge your card" (red alert) | "Update your payment to keep your {Tier} benefits. Your hours are suspended in the meantime." | `[ Update payment method → ]` (Portal) |
| `cancelled` | "Membership ended" (grey notice) | "Your {Tier} membership ended on DD MMM 2026." | `[ Subscribe again → ]` link to `/membership` |

### Button → API → expected webhook

| Button | Calls | Expected follow-up webhook |
|---|---|---|
| Manage / Reactivate / Update payment | `POST /api/membership/portal` → 307 → Stripe Portal URL | `customer.subscription.updated` after user action (eventual) |
| Pause | `POST /api/membership/pause { action: 'pause' }` — DB synchronously flips to `paused` on success | `customer.subscription.updated` (idempotent, no-op) |
| Resume | `POST /api/membership/pause { action: 'resume' }` — DB synchronously flips to `active` on success | `customer.subscription.updated` (then later `invoice.paid` extends period) |
| Subscribe again | Link to `/membership` | None |

### State-machine guard (in `/api/membership/pause`)

| Requested action | Current status | Allowed? | Response |
|---|---|---|---|
| `pause` | `active` AND `cancel_at_period_end=false` | ✓ | 200 |
| `pause` | `active` AND `cancel_at_period_end=true` | ✗ | 409 `invalid_transition` |
| `pause` | `paused` | ✗ | 409 `invalid_transition` |
| `pause` | `past_due` | ✗ | 409 `invalid_transition` (must update payment first) |
| `pause` | `cancelled` | ✗ | 409 `invalid_transition` |
| `resume` | `paused` | ✓ | 200 |
| `resume` | anything else | ✗ | 409 `invalid_transition` |

Disallowed transitions are also **never offered in PlanManager** — the buttons are hidden, not greyed. The 409 path covers race-condition or scripted-call cases, not normal UI use.

### Loading / pending states

- **Portal actions** (Manage / Reactivate / Update payment): button shows a 200-300ms spinner, then `window.location.assign(url)` navigates away. No optimistic UI.
- **Pause / Resume**: synchronous DB write means PlanManager flips immediately on response. React Query's `invalidateQueries(['membership'])` re-derives the view. No polling.
- **Returning from Portal**: settings page refetches `useMembership()` on mount via `refetchOnMount: true`. If the webhook hasn't landed in the 1-3s round-trip, user sees old state briefly then it updates. Acceptable; no spinner on return.

## API routes

Both routes follow Phase A's conventions: Next.js route handlers, `getServerSupabase()`, auth-gated, in-memory rate-limited per IP (10/min), JSON error envelope `{ error: { code, message } }`, and `requireGatewayConfigured()` guard (returns 500 if `PAYMENT_GATEWAY` unset).

### `POST /api/membership/portal`

**Request:** `{ returnUrl?: string }`

**Response:** 200 `{ url: string }`

**Flow:**
1. Rate-limit check → 429 if exceeded.
2. Session check → 401 if signed-out.
3. `requireGatewayConfigured()` → 500 if unset.
4. Read membership; reject with 422 `no_subscription` if: no row, `stripe_subscription_id IS NULL`, or `status='cancelled'`.
5. Reject with 422 `no_customer` if `stripe_customer_id IS NULL` (belt-and-braces).
6. Call `gateway.createPortalSession({ customerId, returnUrl: returnUrl ?? \`${origin}/members/settings\` })`.
7. Return `{ url }`. Gateway throws → 502 `gateway_error`.

| Condition | HTTP | code |
|---|---|---|
| Not signed-in | 401 | `unauthenticated` |
| No membership / cancelled / sub_id NULL | 422 | `no_subscription` |
| Missing stripe_customer_id | 422 | `no_customer` |
| `PAYMENT_GATEWAY` unset | 500 | `gateway_unconfigured` |
| Gateway throws | 502 | `gateway_error` |
| Rate-limited | 429 | `rate_limited` |

### `POST /api/membership/pause`

**Request:** `{ action: 'pause' | 'resume' }` (zod-validated)

**Response:** 200 `{ status: 'paused' | 'active' }`

**Flow:**
1. Rate-limit, session, `requireGatewayConfigured()` guards.
2. Validate body via zod → 400 `invalid_body` on shape error.
3. Read membership; require `stripe_subscription_id IS NOT NULL` → 422 `no_subscription` otherwise.
4. State-machine guard (see table above) → 409 `invalid_transition` with `{ from, to }` in error data.
5. Call `gateway.pauseSubscription(subId)` or `gateway.resumeSubscription(subId)`. Gateway throws → 502 `gateway_error`, DB unchanged.
6. **On gateway success:** Conditional UPDATE — `UPDATE memberships SET status=$new, paused_at=$paused_at WHERE user_id=$1 AND status=$expected_current_status RETURNING *;`. Zero rows returned → 409 `invalid_transition` (race: state changed between read and write).
7. Return `{ status: <new> }`. Client invalidates `useMembership()`.

**Idempotency note:** The route is intentionally not idempotent on duplicate clicks — pause-on-already-paused returns 409, not 200. PlanManager's view variant hides the button after the first successful click, so this only triggers on race conditions or scripted calls. The follow-up `customer.subscription.updated` webhook **is** idempotent (no-ops if DB already matches).

### Shared production-safety guard

Lift the inline guard `/api/webhooks/stripe` currently has into a small helper:

```ts
// src/lib/payment/require-gateway-configured.ts
export function requireGatewayConfigured(): { ok: true } | { ok: false; response: NextResponse } {
  if (process.env.PAYMENT_GATEWAY) return { ok: true };
  return {
    ok: false,
    response: NextResponse.json(
      { error: { code: 'gateway_unconfigured', message: 'Payment gateway not configured' } },
      { status: 500 }
    ),
  };
}
```

`/api/webhooks/stripe` gets refactored to use it (drive-by; no behaviour change). `/api/membership/portal` and `/api/membership/pause` use it from day one.

## Settings page integration

```tsx
// src/app/members/settings/page.tsx
<section className="space-y-6">
  <h2 className="font-serif text-2xl">Plan</h2>
  <PlanManager />
</section>

{/* existing Profile / Email / Password sections below */}
```

`PlanManager` is a client component (`'use client'`) using `useMembership()` for data. Click handlers POST to the routes and invalidate the query on success.

## Mock simulator (`/payment/simulate-portal`)

Dev-only stand-in for Stripe's hosted Customer Portal. Same pattern as the existing `/payment/simulate`.

**Production guard:** First line of the page:

```tsx
if (process.env.NODE_ENV === 'production' && process.env.PAYMENT_GATEWAY !== 'mock') {
  notFound();
}
```

**Layout:**

```
Mock Customer Portal (dev only)

Customer ID: cus_mock_abc123
Subscription: sub_mock_xyz789
Current plan: {Tier} · {status}

[ Cancel subscription ]              → customer.subscription.updated, cancel_at_period_end=true
[ Change to Frequent ]               → customer.subscription.updated, new price_id
[ Change to Pro ]                    → customer.subscription.updated, new price_id
[ Update card (success) ]            → no webhook; toast + redirect (for active users)
[ Update card (fail – simulate decline) ] → invoice.payment_failed
[ Reactivate subscription ]          → only when cancel_at_period_end=true; customer.subscription.updated, cancel_at_period_end=false
[ Trigger invoice.paid (recover from past_due) ] → only when status='past_due'; invoice.paid → handler clears past_due, status='active'

← back to settings
```

The page derives current state from `getMembershipForUser()` on every render (server component); buttons shown reflect the user's actual state. Each button POSTs a synthetic event to `/api/webhooks/stripe` with `x-mock-signature: 1`, then redirects to `/members/settings`.

### Mock gateway extensions

Phase A scaffolded `createPortalSession` / `pauseSubscription` / `resumeSubscription` stubs. Phase B verifies/extends them:

1. `createPortalSession({ customerId, returnUrl })` returns `{ url: '/payment/simulate-portal?customer_id=...&sub_id=...' }`.
2. `pauseSubscription(subId)` and `resumeSubscription(subId)` flip internal state and emit synthetic `customer.subscription.updated` to `/api/webhooks/stripe`.
3. Mock subscription state lives on `globalThis` to survive Next.js dev module re-eval (same pattern Phase A's hotfix applied to `DevBookingStore`).

## Pause + UIOLO interaction

Add an early-return to `src/lib/membership/period-rollover.ts`:

```ts
export function applyUiolo(m: Membership, today: Date): Membership {
  if (m.status !== 'active') return m;  // NEW: paused / past_due / cancelled never roll
  // existing rollover logic unchanged below
  ...
}
```

**Consequence:** A member paused for 6 weeks who had 3h remaining when they paused, still has 3h remaining when they resume. The next `invoice.paid` after resume (the next billing date Stripe charges them on) writes `hours_remaining = tier_max` and a fresh `current_period_end` — that's the rollover event for resumed members, not a calendar-month tick.

This is the industry-standard pattern (Audible / ClassPass / Peloton) and what users expect from "pause."

## Booking gate behaviour (existing, unchanged)

`hasSufficientMemberHours()` in `src/lib/membership/member-hours.ts` already returns `false` for `paused` / `past_due` / `cancelled`. Phase B does not change this. Practical effects:

- **Paused:** member falls to non-member pricing automatically the moment `/api/membership/pause` writes `status='paused'`.
- **past_due:** same — non-member pricing applies; no hard block; user can still book at full price while resolving card.
- **Cancelled:** same.

Tests in Layer 5 below assert this explicitly (paused / past_due / cancelled all get non-member pricing).

## Data flows

### Pause — happy path

1. User clicks Pause on `/members/settings`.
2. Browser POSTs `/api/membership/pause { action: 'pause' }`.
3. Route: rate-limit → session → guard → read membership → state-machine guard → `gateway.pauseSubscription(subId)`.
4. Mock gateway flips internal state and emits synthetic `customer.subscription.updated` (fires-and-forgets).
5. Route's conditional UPDATE writes `status='paused', paused_at=now()` WHERE `status='active'`. Returns 200 `{ status: 'paused' }`.
6. React Query invalidates membership. PlanManager re-derives → renders `paused` variant.
7. (Async) Webhook arrives at `/api/webhooks/stripe`. Handler reads membership: already paused. No-op.

### Cancel-then-reactivate via Portal — happy path

1. User clicks Manage on `/members/settings`. POST `/api/membership/portal`. Route returns `{ url: '/payment/simulate-portal?...' }`. Browser navigates.
2. On mock portal, user clicks "Cancel subscription". Page fires synthetic `customer.subscription.updated` (`cancel_at_period_end=true`) to `/api/webhooks/stripe`. Handler updates `memberships.cancel_at_period_end=true`. Page redirects to `/members/settings`.
3. Settings re-mounts → `useMembership()` refetches → row has `cancel_at_period_end=true, status='active'` → PlanManager renders `pending-cancel` variant.
4. User clicks Reactivate → POST `/api/membership/portal` → mock portal → click "Reactivate subscription" → synthetic `customer.subscription.updated` (`cancel_at_period_end=false`) → redirect.
5. PlanManager renders `active-self` (happy) variant again.

### past_due → update card

1. Stripe (or mock) fires `invoice.payment_failed` → `/api/webhooks/stripe` sets `status='past_due'`.
2. User visits `/members/settings`. PlanManager renders `past_due` variant.
3. User clicks "Update payment method" → POST `/api/membership/portal` → mock portal → "Update card (success)".
4. (In real Stripe: next retry succeeds, fires `invoice.paid` → handler sets `status='active'`, extends period.)
5. In mock: simulator has a separate "Trigger invoice.paid (success)" button to complete the recovery walk.

## Testing strategy

Same layered TDD pattern Phase A used.

**Layer 1 — webhook handler coverage** (`src/lib/payment/__tests__/webhook-handler.test.ts`):

- `customer.subscription.updated` with `cancel_at_period_end=true` → sets `cancel_at_period_end=true`, status stays `active`, period_end synced.
- Same event with `cancel_at_period_end=false` (reactivation) → unsets `cancel_at_period_end`.
- Same event with `pause_collection.behavior='mark_uncollectible'` → sets `status='paused'`, `paused_at`.
- Same event paused → active → clears `paused_at`, `status='active'`.
- Stale-event guard: event `created` older than row `updated_at` → no-op.
- Idempotency: same event applied twice → same end state.

**Layer 2 — mock gateway** (`src/lib/payment/__tests__/mock-gateway.test.ts`):

- `createPortalSession({ customerId, returnUrl })` returns expected URL shape.
- `pauseSubscription(subId)` emits synthetic `customer.subscription.updated` with expected shape.
- `resumeSubscription(subId)` mirror.
- `createPortalSession` for unknown customer → throws.

**Layer 3 — new API routes**:

`src/app/api/membership/portal/__tests__/route.test.ts`:
- Unauthenticated → 401.
- No membership → 422 `no_subscription`.
- Cancelled membership → 422 `no_subscription`.
- Admin-created (`stripe_subscription_id IS NULL`) → 422 `no_subscription`.
- Missing `stripe_customer_id` → 422 `no_customer`.
- `PAYMENT_GATEWAY` unset → 500 `gateway_unconfigured`.
- Gateway throws → 502 `gateway_error`.
- Happy path → 200 with `{ url }`.
- 11th request in 60s → 429.

`src/app/api/membership/pause/__tests__/route.test.ts`:
- Unauthenticated → 401.
- Invalid body shape → 400.
- Admin row → 422 `no_subscription`.
- Pause on already-paused → 409 `invalid_transition`.
- Pause on past_due → 409.
- Pause on `cancel_at_period_end=true` → 409.
- Resume on active → 409.
- Happy paths: pause-then-resume → 200 / 200; DB asserted with `status` and `paused_at` updated.
- Gateway success but conditional UPDATE returns 0 rows (race) → 409.
- Gateway throws → 502, DB unchanged.

**Layer 4 — `PlanManager` UI** (`src/components/membership/__tests__/PlanManager.test.tsx`):

- One render assertion per view variant (7 variants).
- `pending-cancel`: "Cancels on DD MMM" computed from `current_period_end`.
- `past_due`: warning copy + Update payment button only.
- `cancelled`: Subscribe-again link → `/membership`.
- Click handlers fire `fetch` POST with right body (mocked).
- After successful pause: `useMembership` invalidated; variant re-derives.
- Error inline render on non-2xx response.

**Layer 5 — touch-ups to existing tests**:

- `useMembership.test.tsx`: paused row reads back with `status='paused'`, `paused_at` populated.
- `membership-reader.test.ts`: paused / past_due / cancelled rows pass through UIOLO unchanged.
- `period-rollover.test.ts`: paused row with stale `period_start` does **not** auto-reset hours.
- `member-hours.test.ts`: `hasSufficientMemberHours` returns `false` for paused / past_due / cancelled even with hours > 0.
- `calculate-price.test.ts`: paused / past_due / cancelled get non-member pricing.

**Test totals (rough):** Phase A landed at 430+; Phase B adds ~50-70 assertions (L1: ~8, L2: ~6, L3: ~18, L4: ~14, L5: ~10). Target: ~480-500 passing, 0 failing.

## Verification (browser walks on staging)

After tests pass:

1. **Pause flow:** Active member → settings → Pause → confirm "Membership paused" + Resume button. Try to book on `/butlers/bespoke` → confirm non-member pricing. Resume → confirm member pricing returns.
2. **Cancel via mock portal:** Settings → Manage → mock portal → Cancel → return → confirm `pending-cancel` UI + Reactivate. Reactivate → mock portal → return → `active-self` UI.
3. **Plan-swap:** Settings → Manage → mock portal → "Change to Pro" → return → confirm new tier badge + new monthly allowance.
4. **past_due:** Mock portal → "Update card (fail)" → return → confirm red alert + Update payment. Update payment → "Update card (success)" → simulator "Trigger invoice.paid (recover from past_due)" → confirm `active-self`.
5. **Pause webhook idempotency:** Pause → DB writes `status='paused'`; webhook lands → assert no second write, DB unchanged.
6. **Admin-created member:** Admin panel creates a membership → log in as that user → settings → confirm read-only summary + "contact" footer + no action buttons.

## What this does NOT do (deferred)

- **Real Stripe wiring.** `StripeGateway` stays a stub. Real Stripe is the next focused PR after Phase B lands on staging. The 7 stub methods become its implementation checklist.
- **Annual billing toggle.** Monthly only.
- **Coupon / promo codes.** Stripe Checkout supports it natively; flip when Faridah wants.
- **Past-due dunning emails.** Stripe Smart Retries + Stripe's own dunning email is enough for v1.
- **Member welcome / pause / resume / cancel notification emails.** Resend templates fired by webhook handler in a later PR if asked for.
- **Pause duration limit / auto-resume.** Pause is indefinite until user clicks Resume.
- **Plan-swap pro-ration preview UI.** Stripe Portal handles pro-ration on its side.

## Risk register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Webhook arrives before/during synchronous DB write (pause/resume race) | Low | Handler is idempotent; no-ops if state already matches |
| Customer Portal session URL expires before user clicks | Negligible | Sessions live 1 hour; we always create fresh on click |
| User clicks Pause twice rapidly | Low | State-machine guard returns 409 on second; rate limit catches abuse |
| Mock subscription state lost on Next.js dev module re-eval | Medium | `globalThis` singleton (same pattern as Phase A's `DevBookingStore` fix) |
| Faridah wants pause UX changes after seeing on staging | Medium | Mock simulator means demo + iterate before real Stripe; PlanManager state matrix is easy to extend |
| Tier-rename prereq blocks Phase B on Faridah's allowance numbers | High | Spec calls this out; Phase B PR cannot start until prereq lands |

## Branch + PR

- Prereq branch: `feat--tier-rename-reprice` off `staging`. Ships first.
- Phase B branch: `feat--phase-b-self-serve` off `staging` (after prereq merges).
- Single PR back to `staging`.
- **Never merged to `main`** — standing rule.
- Real Stripe wiring is a follow-up PR after Phase B lands on staging.

## Alternatives considered

- **Webhook-only DB writes for pause/resume** — rejected. Booking gate reads `status` synchronously; user clicking Pause then booking immediately must see non-member pricing without a 1-3s webhook race.
- **Idempotent pause route** (200 on already-paused) — rejected. PlanManager hides the button after first success, so duplicate calls indicate scripted use or a race; surfacing 409 is the honest signal.
- **Splitting Phase B into two PRs** (portal first, pause second) — rejected. Both touch `PlanManager` and the mock simulator; splitting means building each twice.
- **Optimistic UI for pause** (write DB before gateway, rollback on failure) — rejected. Process-death window leaves DB inconsistent with Stripe; safer to gate on gateway success.
- **Full deflection flow in mock portal** — rejected. Real Stripe gives this for free; building to throw away is waste.
- **Hard block on `past_due` booking** — rejected. Butlers is a service business, not a digital subscription; keep door open at non-member price (industry pattern for hospitality/concierge).
- **Reset hours to full on resume from pause** — rejected. Resuming users get exactly what they paid for; preserving remaining hours is the industry pattern (Audible, ClassPass, Peloton).
