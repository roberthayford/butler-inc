# C-rate — Member pricing flat at £50, UIOLO at period boundary (Design)

**Date:** 2026-05-24
**Author:** Rob Hayford (paired with Claude)
**Brief reference:** Implementation Brief May 2026 → Section C (subset — the rate flip, not Stripe live integration)
**Faridah's latest note (2026-05-24):**

> the rate for members remains £50 regardless of urgency (for now). Bespoke, I don't think we ever settled on a price. Either way, I think we should make it Price upon consultation. Budget should also be £50 ph. So we are getting rid of the £35 option entirely. We need to consider what happens "what if they don't use up their monthly".

**Status:** Approved for implementation

## Why

Three things land in one PR:

1. **The £35 floor is being eliminated.** Budget Butler price is going up to £50/hr. The "Budget" name stays (it's still the relatively-cheaper tier for time-flexible bookings) but the rate matches every other self-service butler.
2. **Members get a real benefit at checkout.** Today, `MEMBER_HOURLY_RATE` is only *displayed* on the members dashboard — at actual booking time, members pay the full butler rate plus urgency surcharges. After this PR, signed-in members pay £50/hr flat with no urgency premium, full stop.
3. **The "unused hours" question gets a defined answer.** Use it or lose it (UIOLO): hours reset to tier max at the billing period boundary, no rollover. Simplest of the three options brainstormed; the other two (rollover-with-cap, convert-to-PAYG-credit) stay documented here as alternatives Faridah can opt into later.

## Decisions locked

| Decision | Choice | Why |
|---|---|---|
| Budget Butler hourly rate | £50 | Faridah's note — eliminating £35 entirely |
| Bespoke Butler displayed rate | "Price upon consultation" (no figure) | Faridah's note — never settled on a price |
| Member rate semantics | True flat £50 at checkout, exempt from urgency | Most literal read of Faridah's note + her 13 May "package holders do not pay premiums?" line |
| Unused hours at period end | Use it or lose it | Simplest, standard SaaS pattern, no schema change needed |

## What changes

### 1. Pricing config (`src/data/pricing-config.ts`)

- `BUTLER_PRICING.budget.hourlyRate`: `35` → `50`
- `BUTLER_PRICING.bespoke.hourlyRate`: `120` → `null` (the type already permits this conceptually since `bookingType: "consultation"` skips price display; making the value `null` stops it being a misleading number in code)

### 2. Member rate constant (`src/data/membership-config.ts`)

- `MEMBER_HOURLY_RATE`: `35` → `50`

### 3. `calculatePricePreview()` — member-aware (`src/lib/pricing/calculate-price.ts`)

New optional `isMember?: boolean` parameter on `PricePreviewInput`. When `true`:

- `hourlyRate` is overridden to `MEMBER_HOURLY_RATE`
- Urgency multiplier is forced to `1.0`
- `urgencyLabel` becomes `"Member rate"` (was `"Same-day premium"` / `"Next-day premium"` / `null`)
- `breakdown` reads `"£50/hr × Nhrs = £M.00"` (no multiplier segment)

Non-member callers (`isMember` undefined or `false`) behave exactly as before.

### 4. `PricedBookingForm.tsx`

- Add `useMembership()` call alongside the existing `useAuth()`
- Derive `isMember = membership?.status === "active"`
- Pass `isMember` into the price calculation
- When `isMember`, the booking summary panel shows a "Member rate" pill instead of any urgency surcharge pill

### 5. Server-side recompute (`/api/bookings/*`)

- Booking submit endpoint reads membership from the session-authenticated user
- Recomputes the price with the server's view of `isMember`
- Rejects the booking with 400 if the client-submitted total disagrees with the server-computed total beyond a 1p tolerance

### 6. UIOLO lazy reset

- In `useMembership()` (client) and the equivalent server-side membership lookup, before returning the row: if `billing_period_end < today`, reset `personal_hours_used = 0` and `virtual_tasks_used = 0`, advance the period (`billing_period_start = old end + 1 day`, `billing_period_end = new start + 1 month`), write back, then return the freshened row
- No cron; no schema change
- Acceptable v1 risk: a member who is inactive for a long time has stale numbers in admin views until next read; corrects itself on next member action

### 7. Tests (TDD)

Following `/test-driven-development`:

- `calculate-price.test.ts`: new `isMember: true` cases — forces £50, forces multiplier 1.0, labels "Member rate", breakdown formatting
- `useMembership` test: when `billing_period_end < today`, returned data shows `personalHoursUsed = 0` and an advanced period
- `membership-config.test.ts`: update `MEMBER_HOURLY_RATE` assertion 35 → 50
- New booking-API test: client posts a tampered low total; server rejects with 400
- Existing pricing tests: re-baseline any that assert £35 or pre-flag urgency for members

## What this does NOT do (deferred)

- **Stripe live integration** — biggest piece of Section C; needs its own multi-PR effort + Stripe account setup
- **Tier value changes** (£500 / £1k / TBC) — still blocked on Faridah locking values
- **Tier rename** (Lite / Frequent / Daily) — still blocked
- **Hours ledger refactor** — brief recommended this as a future improvement; UIOLO lazy reset works fine with the existing mutable-counter schema
- **Overage billing** — what happens when a member is over their allowance and tries to book more. Currently the CHECK constraint just blocks; needs proper UX/billing flow eventually
- **Cron-based UIOLO reset** (Option β in the brainstorm) — easy follow-up if admin reporting needs accurate numbers for inactive members
- **Migration of seeded `membership_tiers` rows** — values in that table are tier definitions (hours, monthly price), not the £35 hourly rate. The hourly rate is purely a code constant. No DB write needed for this PR.

## Branch + PR

- Branch: `feat--c-rate-pricing-uiolo` off `staging`
- Single PR back to `staging`
- **NOT auto-merged** — Rob reviews before the merge call, same as PR #16 (A7)
- **Never merged to `main`** — standing rule

## Verification

- `npm run test:run`: 314 (baseline) + ~6 new = ~320 passing, 0 failing
- `npm run lint`: 6 errors / 12 warnings unchanged (all pre-existing)
- Browser walk as `roberthayford@gmail.com` (Essential tier):
  - `/butlers/busy` → service → today, 10:15–12:15 → expect `"£50/hr × 2hrs = £100.00"` with "Member rate" pill, no premium pill
  - Compare to anonymous user: same booking → `"£50/hr × 2hrs × 1.5 = £150.00"` with "Same-day premium" pill — should be unchanged from current behaviour

## Alternative rollover policies (documented for Faridah)

The selected policy is **use it or lose it**. If Faridah wants to revisit:

- **Rollover with cap** — add `personal_hours_rolled_over` column; at period boundary, `rolled_over = MIN(unused, cap)`; cap suggestion = tier hours (so Essential 15 → max 30 carry). One migration, light UI work.
- **Convert to PAYG credit** — new `member_credits` table; at period boundary, unused hours × £50 becomes credit balance; credit applies at checkout before billing. Bigger refactor; touches Stripe integration when that lands.
