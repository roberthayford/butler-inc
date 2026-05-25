# Membership Lifecycle Confirmations — Design

**Date:** 2026-05-25
**Branch (target):** `staging`
**Status:** Draft, awaiting user review
**Related:** Sub-project #3 from the original three-way decomposition. Siblings: `2026-05-25-logged-in-navigation-coverage-design.md` (sub-project #2, merged via PR #25), `2026-05-25-signup-confirmation-flow-design.md` (sub-project #1, merged via PR #27). Depends on the Phase B self-serve plumbing in `2026-05-24-phase-b-self-serve-design.md`.

## Problem

Membership lifecycle state changes flow into the database cleanly via the webhook handlers in `src/lib/payment/webhook-handler.ts`, but the member is almost never told what happened.

Concrete gaps:

1. **Welcome on activation.** `src/app/members/checkout/success/CheckoutActivating.tsx` polls then `router.push("/members/dashboard?welcome=1")`, but `src/app/members/dashboard/page.tsx` does not read `?welcome=1`. The post-signup moment is silent.
2. **Pause / Resume.** `src/components/membership/PlanManager.tsx` (lines 214-233) flips the row synchronously via `POST /api/membership/pause` and shows no success feedback.
3. **Cancel / Reactivate / Plan change.** These happen in the Customer Portal. The user lands back on `/members/settings` with no acknowledgement of what just changed.
4. **Renewal (`invoice.paid`).** The period rolls and hours refill silently.
5. **Payment failed (`past_due`).** Only visible if the member visits `/members/settings`. The dashboard and other member pages show no warning.
6. **Cancellation scheduled / final.** Only visible on settings.
7. **No transactional emails for any lifecycle event.** Resend + `@react-email/components` are already wired (`src/app/api/bookings/route.ts`, `src/emails/booking-confirmation.tsx`) for booking flows.

## Goals

- Confirm every lifecycle transition through two surfaces: an in-app surface (toast or persistent banner, as appropriate) AND a transactional email.
- Make payment failures and pending cancellations visible from any signed-in member page, not just `/members/settings`.
- Notify Butlers Inc internally on the high-signal moments (new member, payment failed, pause, cancellation scheduled, cancellation final).
- Stay idempotent under Stripe's webhook retries and the mock simulator's potential double-fires.
- Keep webhook DB-write correctness independent of email plumbing (email failures must never bubble out of a webhook handler).

## Non-goals

- Email preferences / unsubscribe UI. Transactional emails are exempt under UK PECR and CAN-SPAM; all eight member emails are treated as required.
- Push notifications, SMS.
- Admin dashboard for lifecycle event history (the new `lifecycle_email_log` table supports a future build).
- Backfill emails for memberships that pre-date this work.
- "Payment method updated" toast on portal return (no schema diff to detect reliably).
- Migrating existing booking emails to share the new idempotency table.
- Localisation (English only, per the rest of the site).
- Real Stripe wiring (`StripeGateway` is a separate ticket gated on Faridah's Stripe account per the production-readiness doc).

## Decisions

Settled during brainstorming:

1. **Email source = webhook handlers.** Single source of truth, mirrors how Stripe-native shops work, covers portal-only events (cancel, plan change) that the app never sees an API call for.
2. **Persistent state banner reaches all `/members/*` pages**, mounted from `src/app/members/layout.tsx`, not just the settings page.
3. **Welcome experience** = sonner toast + dismissible welcome card on `/members/dashboard?welcome=1`.
4. **Portal return acknowledgement** = snapshot-diff toast. Pre-portal snapshot stashed in sessionStorage; settings page consumes on mount and toasts the specific change.
5. **Architecture** = `LifecycleNotifier` orchestrator. Each webhook handler calls `notifyLifecycle(transition, db)` after its DB write; transition detection and Resend calls funnel through one helper.
6. **Admin notifications fire for high-signal moments only**: new member, payment failed, **pause (self-serve)**, **cancellation scheduled (self-serve)**, cancellation final. Resume / renewal / plan-change skip admin (too noisy).
7. **Idempotency via `lifecycle_email_log` table** with composite PK `(event_id, transition, recipient)`. Insert-first, send-second pattern.

## The seven lifecycle moments (mapped to surfaces)

| # | Trigger | Webhook event | Member email | Admin email | In-app surface |
|---|---|---|---|---|---|
| 1 | First activation | `checkout.session.completed` (fresh insert OR admin-overlap upgrade) | Welcome | Yes | Toast + dismissible welcome card on `/members/dashboard?welcome=1` |
| 2 | Renewal | `invoice.paid` (period rolled) | Renewal receipt | No | UsageGauge already resets via UIOLO; no new surface |
| 3 | Payment failed | `invoice.payment_failed` (status `active` → `past_due`) | Payment failed | Yes | Persistent red banner on all `/members/*` |
| 4 | Paused (self-serve) | `customer.subscription.updated` (status `active` → `paused`) | Pause confirmed | **Yes** | Toast on PlanManager + persistent amber banner on all `/members/*` |
| 5 | Resumed (self-serve) | `customer.subscription.updated` (status `paused` → `active`) | Resume confirmed | No | Toast on PlanManager; banner disappears |
| 6 | Cancellation scheduled (portal) | `customer.subscription.updated` (`cancel_at_period_end` `false` → `true`) | Cancellation scheduled | **Yes** | Snapshot-diff toast on settings return + persistent amber banner on all `/members/*` |
| 7 | Cancellation final (period end) | `customer.subscription.deleted` | Cancellation final + re-subscribe CTA | Yes | None (terminal); PlanManager's cancelled variant takes over |
| 8 | Plan changed (portal up/downgrade) | `customer.subscription.updated` (`tier_id` changed) | Plan changed | No | Snapshot-diff toast on settings return |

## Architecture

### New files

| File | Purpose |
|---|---|
| `supabase/migrations/<n>_lifecycle_email_log.sql` | Creates the idempotency table + RLS (service-role-only). |
| `src/lib/membership/lifecycle-transitions.ts` | Pure detection: `(prevRow, event, updatedRow) → Transition` discriminated union. Trivially unit-testable. |
| `src/lib/membership/lifecycle-notifier.ts` | The orchestrator. `notifyLifecycle(transition, db, recipient)` handles idempotency-log INSERT, fans out to template render + Resend send (member and optional admin), handles failures by deleting the log row so Stripe retries can re-attempt. |
| `src/lib/membership/portal-snapshot.ts` | `stashPortalSnapshot(m)`, `consumePortalSnapshot()`, `diffSnapshot(prev, curr)`. sessionStorage-backed. |
| `src/lib/membership/__tests__/lifecycle-transitions.test.ts` | Table-driven, one test per transition rule. |
| `src/lib/membership/__tests__/lifecycle-notifier.test.ts` | Mocked Resend; per-transition send assertions; idempotency; failure modes. |
| `src/lib/membership/__tests__/portal-snapshot.test.ts` | Diff matrix; sessionStorage round-trip. |
| `src/emails/membership/WelcomeEmail.tsx` | Member-facing welcome. |
| `src/emails/membership/RenewalReceiptEmail.tsx` | Renewal receipt. |
| `src/emails/membership/PaymentFailedEmail.tsx` | Recovery CTA. |
| `src/emails/membership/PauseConfirmedEmail.tsx` | Pause confirmed. |
| `src/emails/membership/ResumeConfirmedEmail.tsx` | Resume confirmed. |
| `src/emails/membership/CancellationScheduledEmail.tsx` | Cancellation scheduled. |
| `src/emails/membership/CancellationFinalEmail.tsx` | Cancellation final. |
| `src/emails/membership/PlanChangedEmail.tsx` | Plan changed. |
| `src/emails/membership/admin/NewMemberNotification.tsx` | Admin: new member activated. |
| `src/emails/membership/admin/PaymentFailedNotification.tsx` | Admin: payment failed. |
| `src/emails/membership/admin/PauseNotification.tsx` | Admin: pause. |
| `src/emails/membership/admin/CancelScheduledNotification.tsx` | Admin: cancellation scheduled. |
| `src/emails/membership/admin/CancellationFinalNotification.tsx` | Admin: cancellation final. |
| `src/emails/membership/__tests__/*.test.tsx` | One render-to-html + structural snapshot per template. |
| `src/components/members/MembershipBanner.tsx` | Client component. `useMembership()` driven. Returns null when `status='active' && !cancel_at_period_end`; otherwise renders past_due / paused / pending-cancel variant. |
| `src/components/members/WelcomeBanner.tsx` | Client component. Renders when `?welcome=1` present AND localStorage flag unset. Dismissible. |
| `src/components/members/__tests__/MembershipBanner.test.tsx` | Variants, hide-when-active, action wiring. |
| `src/components/members/__tests__/WelcomeBanner.test.tsx` | Query-param + localStorage gating, dismissal. |

### Modified files

| File | Change |
|---|---|
| `src/lib/payment/webhook-handler.ts` | Each handler captures the prior row (already read for stale-event guard), performs its existing UPDATE, then calls `await notifyLifecycle({ event, priorRow, updatedRow, recipient }, db)`. Wrapped in try/catch; errors logged but never rethrown. The handler still returns successfully so the webhook route returns 200 to Stripe. |
| `src/app/api/webhooks/stripe/route.ts` | No code change; existing dispatch works. |
| `src/app/api/webhooks/__tests__/stripe.test.ts` | Extend with assertions that `notifyLifecycle` is invoked per event with the expected transition kind. Uses existing Stripe sample-event fixtures. |
| `src/app/members/layout.tsx` | Mount `<MembershipBanner />` just below `<Header />`; mount `<WelcomeBanner />` at the top of the content area. |
| `src/app/members/dashboard/page.tsx` | Read `?welcome=1` via `useSearchParams`; on first render with the flag, fire `toast.success("Welcome to {Tier}, your hours are ready")`; then `router.replace('/members/dashboard')` to strip the param so a tab return does not re-fire. |
| `src/components/membership/PlanManager.tsx` | On `pauseOrResume` success, fire `toast.success(action === 'pause' ? 'Membership paused' : 'Membership resumed')`. On `openPortal`, call `stashPortalSnapshot(membership)` before `window.location.assign(url)`. |
| `src/app/members/settings/page.tsx` | On mount, call `consumePortalSnapshot()`; if present, after `useMembership()` resolves, diff and fire the appropriate toast. Briefly poll for up to 5s (800ms interval) if no change detected yet, then fire a generic `toast.info("We've updated your subscription. Check your email for confirmation.")`. |
| `src/app/payment/simulate-portal/page.tsx` | Add `id: \`evt_mock_${crypto.randomUUID()}\`` to every `fireWebhook` body so mock-mode idempotency keys are meaningful. |
| `src/lib/payment/mock-webhook-signature.ts` | No change required; signs the same JSON. |
| `CLAUDE.md` | Document `MEMBERSHIP_ADMIN_NOTIFY_EMAIL` env var, the lifecycle-notifier pattern, the new file inventory. |

### Data flow

```
Stripe (or mock) → POST /api/webhooks/stripe → signature verified
  → dispatch to handler in webhook-handler.ts
    → read prior row (already done for stale-event guard)
    → UPDATE membership
    → resolve recipient = { email, name } via auth.users service-client lookup
    → transition = detectTransition({ event, priorRow, updatedRow, recipient })
    → try {
        await notifyLifecycle(transition, db, recipient)
          → INSERT into lifecycle_email_log (event_id, transition.kind, "member")
              ON CONFLICT DO NOTHING RETURNING *
          → if RETURNING empty: skip (duplicate)
          → else: render template, resend.emails.send(...)
              → success: UPDATE log row with resend_id
              → failure: DELETE log row, log error
          → repeat for "admin" recipient if applicable
      } catch (err) {
        console.error("lifecycle.notify.failed", err)  // never rethrow
      }
  → return 200
```

## Transition detection rules (`lifecycle-transitions.ts`)

```ts
type MembershipRow = {
  id: string;
  user_id: string;
  status: string;
  tier_id: string | null;
  cancel_at_period_end: boolean;
  billing_period_end: string;
  stripe_subscription_id: string | null;
  updated_at: string;
};

type Transition =
  | { kind: "activated"; tierSlug: string; hoursTotal: number; tasksTotal: number; renewsAt: string }
  | { kind: "renewed"; tierSlug: string; periodEnd: string; monthlyPrice: number }
  | { kind: "payment_failed"; tierSlug: string }
  | { kind: "paused"; tierSlug: string }
  | { kind: "resumed"; tierSlug: string }
  | { kind: "cancel_scheduled"; tierSlug: string; endsAt: string }
  | { kind: "cancel_reversed"; tierSlug: string }
  | { kind: "cancelled"; tierSlug: string }
  | { kind: "plan_changed"; fromTierSlug: string; toTierSlug: string; newHoursTotal: number; renewsAt: string }
  | { kind: "noop" };

function detectTransition(args: {
  event: WebhookEvent;
  priorRow: MembershipRow | null;
  updatedRow: MembershipRow;
  tierSlugLookup: (tierId: string | null) => string;
}): Transition;
```

### Per-event rules

| Event | Prior | Updated | Transition |
|---|---|---|---|
| `checkout.session.completed` | `null` (fresh INSERT) | new row | `activated` |
| `checkout.session.completed` | exists, no `stripe_subscription_id` | gained `stripe_subscription_id` | `activated` (admin-overlap upgrade) |
| `customer.subscription.updated` | `status='active'`, `cap=false` | `status='paused'` | `paused` |
| `customer.subscription.updated` | `status='paused'` | `status='active'` | `resumed` |
| `customer.subscription.updated` | `cap=false` | `cap=true`, status unchanged | `cancel_scheduled` |
| `customer.subscription.updated` | `cap=true` | `cap=false`, status unchanged | `cancel_reversed` |
| `customer.subscription.updated` | `tier_id=X` | `tier_id=Y` (Y != X), no other transition | `plan_changed` |
| `customer.subscription.updated` | any | no above change | `noop` |
| `customer.subscription.deleted` | any | `status='cancelled'` | `cancelled` |
| `invoice.paid` | `billing_period_end=T` | `billing_period_end=T` (identical) | `noop` |
| `invoice.paid` | `billing_period_end=T` | `billing_period_end=T'` (T' > T) | `renewed` |
| `invoice.payment_failed` | `status='active'` | `status='past_due'` | `payment_failed` |
| `invoice.payment_failed` | `status='past_due'` | unchanged | `noop` |

`cap` is shorthand for `cancel_at_period_end`.

### Edge cases

- **Pause + cancel scheduled simultaneously** in one `subscription.updated` payload: detection picks `paused` (more user-actionable); the cancel scheduled flag carries on the row but no separate email fires. If the user later resumes without removing the schedule, the next event has `cap=true` already prior → `cancel_scheduled` correctly noops.
- **Plan change during pause** (rare, possible via portal): `plan_changed` wins; pause state preserved on the row, no email about the pause again.
- **Webhook replay (same event.id):** insert into `lifecycle_email_log` returns no rows → notifier short-circuits before any Resend call.
- **Stale event (out-of-order delivery):** existing stale-event guard in `webhook-handler.ts` returns early before the UPDATE *and* before the notify call; no duplicate emails.

## Idempotency

### Schema

```sql
create table lifecycle_email_log (
  event_id     text not null,
  transition   text not null,
  recipient    text not null check (recipient in ('member', 'admin')),
  sent_at      timestamptz not null default now(),
  resend_id    text,
  primary key (event_id, transition, recipient)
);

alter table lifecycle_email_log enable row level security;
-- No grants; service role only (matches the rest of the membership infrastructure).
```

### Insert-first send-second flow

1. `INSERT INTO lifecycle_email_log VALUES (...) ON CONFLICT DO NOTHING RETURNING *`.
2. If `RETURNING` returns no rows → another replay already sent; skip the Resend call.
3. If `RETURNING` returns one row → render template + `resend.emails.send(...)`.
4. On Resend success → `UPDATE ... SET resend_id = $1`.
5. On Resend failure → `DELETE FROM lifecycle_email_log WHERE ...` so the next webhook retry can re-attempt; log the error with full body.

### Mock event IDs

The mock simulator currently sends events without an `id`. Update `src/app/payment/simulate-portal/page.tsx` to include `id: \`evt_mock_${crypto.randomUUID()}\`` on every `fireWebhook` body so dev/staging idempotency keys are meaningful and replays are testable.

## Error handling

| Failure | Behaviour |
|---|---|
| Resend API down (timeout / 5xx / network) | Log; DELETE log row so the next Stripe webhook retry re-attempts; webhook handler still returns 200. |
| Resend rejects (4xx invalid email, suppressed address) | Log with full error body; **KEEP log row** to prevent a retry storm on every Stripe replay; emit `lifecycle.email.permanent_failure` console.error for manual follow-up. |
| Member email missing from `auth.users` (deleted account) | Skip member send; attempt admin send if applicable; do not throw. |
| Admin send fails | Member email already attempted independently; log; do not roll back member send. |
| `lifecycle_email_log` INSERT fails (DB down) | Log + skip both sends. Webhook still returns 200; the membership row's DB write committed earlier in the handler. Stripe retry re-attempts. |
| `notifyLifecycle` throws unexpectedly | Outer try/catch in each webhook handler logs and swallows. **Lifecycle data correctness must never be held hostage by email plumbing.** |

## In-app surfaces

### `<MembershipBanner />`

Mounted in `src/app/members/layout.tsx`, just below `<Header />`. Reads `useMembership()`. Returns `null` when `status='active'` AND `cancel_at_period_end === false`.

| Variant | Trigger | Style | Copy | Action |
|---|---|---|---|---|
| `past_due` | `status='past_due'` | Red border + `bg-red-900/10`, exclamation icon | **We couldn't charge your card.** Update your payment method to keep your {Tier} benefits. Your hours are paused in the meantime. | `[ Update payment method → ]` → portal |
| `paused` | `status='paused'` | Amber border + `bg-yellow-900/10`, pause icon | **Your membership is paused.** Billing is suspended. Member pricing returns when you resume. | `[ Resume membership ]` → `POST /api/membership/pause { action: 'resume' }` |
| `pending-cancel` | `status='active'` AND `cancel_at_period_end=true` | Amber border + `bg-yellow-900/10`, clock icon | **Cancellation scheduled.** Your {Tier} membership ends on {date}. You can still use your remaining {n}h until then. | `[ Reactivate subscription → ]` → portal |

Full-width inside `max-w-4xl` container. Not sticky; scrolls with content. Not dismissible (these are status, not notifications).

### `<WelcomeBanner />`

Mounted in `src/app/members/layout.tsx`. Reads `?welcome=1` from `useSearchParams` AND a `localStorage` flag `butlers.welcome.dismissed.v1`. Renders only when query flag present AND localStorage flag unset.

```
┌──────────────────────────────────────────────────────────┐
│  Welcome to {Tier}                                  ✕    │
│                                                          │
│  Your {n} hours are ready. Here's what to try first:     │
│                                                          │
│  ⚬  Book a Personal Butler  →                            │
│  ⚬  Submit a Virtual Butler task  →                      │
│  ⚬  Genie for urgent requests (sticky bar, bottom-right) │
└──────────────────────────────────────────────────────────┘
```

Brass-bordered card on charcoal, `rounded-sm`, `p-6`, optical-white text. Dismiss button writes `localStorage.setItem('butlers.welcome.dismissed.v1', '1')`.

### Toasts

| Trigger | Toast |
|---|---|
| First load of `/members/dashboard?welcome=1` | `toast.success("Welcome to {Tier}, your hours are ready")` followed by `router.replace('/members/dashboard')` |
| `POST /api/membership/pause { action: 'pause' }` returns 200 | `toast.success("Membership paused")` |
| `POST /api/membership/pause { action: 'resume' }` returns 200 | `toast.success("Membership resumed")` |
| Settings mount, snapshot diff = `plan_changed` | `toast.success("Plan changed to {newTier}")` |
| Settings mount, snapshot diff = `cancel_scheduled` | `toast.success("Cancellation scheduled for {date}")` |
| Settings mount, snapshot diff = `cancel_reversed` | `toast.success("Cancellation reversed")` |
| Settings mount, snapshot diff = `cancelled` | `toast.success("Membership cancelled")` |
| Settings mount, snapshot consumed but no diff after 5s polling | `toast.info("We've updated your subscription. Check your email for confirmation.")` |

### Snapshot diff logic (`portal-snapshot.ts`)

```ts
type Snapshot = { status: string; tierSlug: string; cancelAtPeriodEnd: boolean };

function diffSnapshot(prev: Snapshot, curr: Snapshot):
  | { kind: "plan_changed"; toTier: string }
  | { kind: "cancel_scheduled" }
  | { kind: "cancel_reversed" }
  | { kind: "cancelled" }
  | { kind: "no_change" } {
  if (prev.status === "active" && curr.status === "cancelled") return { kind: "cancelled" };
  if (prev.cancelAtPeriodEnd === false && curr.cancelAtPeriodEnd === true) return { kind: "cancel_scheduled" };
  if (prev.cancelAtPeriodEnd === true && curr.cancelAtPeriodEnd === false) return { kind: "cancel_reversed" };
  if (prev.tierSlug !== curr.tierSlug) return { kind: "plan_changed", toTier: curr.tierSlug };
  return { kind: "no_change" };
}
```

Card-updated is intentionally not detected (no schema diff). Settings page falls back to the generic toast when snapshot is consumed but `no_change` persists past the 5s polling window.

## Email copy

All emails share `EmailHeader` / `EmailFooter` from `src/emails/components/`. From: `Butlers Inc <memberships@butlersinc.com>`. Reply-to: `hello@butlersinc.com`. No em dashes. Pretext (`<Preview>`) on every email.

### Member templates

| Template | Subject | Preview | Body summary |
|---|---|---|---|
| `WelcomeEmail` | `Welcome to Butlers Inc {Tier}` | `Your {n} hours are ready. Here's where to start.` | "Hello {name}, your {Tier} membership is active. You have {n} personal butler hours and {m} virtual tasks available this period. Renews on {date}." CTA `[ Book your first butler ]` → `/members/dashboard`. |
| `RenewalReceiptEmail` | `Your Butlers Inc {Tier} has renewed` | `£{monthlyPrice} charged. Hours refreshed.` | "Hello {name}, your {Tier} membership renewed today. £{monthlyPrice} was charged to the card on file. Your {n} personal butler hours and {m} virtual tasks are refreshed for the new period (ends {date})." Receipt detail block (period, tier, monthly price). **Note:** `monthlyPrice` is sourced from `membership-config.ts` via `tierSlug` lookup, not from the `invoice.paid` payload (our `WebhookEvent` shape does not currently carry `amount_paid`; if real Stripe wiring later exposes it, swap to the payload value for proration accuracy). |
| `PaymentFailedEmail` | `Action needed: payment failed for your Butlers Inc {Tier}` | `Update your card to keep your benefits.` | "Hello {name}, we couldn't charge your card for your {Tier} membership. Your member benefits are paused until your payment method is updated. We'll retry automatically over the next few days." CTA `[ Update payment method ]`. |
| `PauseConfirmedEmail` | `Your Butlers Inc {Tier} is paused` | `Billing is suspended. Resume anytime.` | "Hello {name}, your {Tier} membership is paused. Billing is suspended and member pricing is unavailable until you resume. Your usage and renewal date pick up where you left off." CTA `[ Resume membership ]` → `/members/settings`. |
| `ResumeConfirmedEmail` | `Welcome back to your Butlers Inc {Tier}` | `Hours available, billing resumed.` | "Hello {name}, your {Tier} membership is active again. Billing resumes today and your hours are available immediately." CTA `[ Book a butler ]`. |
| `CancellationScheduledEmail` | `Your Butlers Inc {Tier} cancels on {date}` | `Reactivate before then to keep your slot.` | "Hello {name}, we've scheduled your {Tier} cancellation for {date}. You still have access until then, including any remaining hours. Reactivate any time before {date} and nothing changes." CTA `[ Reactivate ]`. |
| `CancellationFinalEmail` | `Your Butlers Inc {Tier} has ended` | `Thank you. The door's open if you want to return.` | "Hello {name}, your {Tier} membership ended on {date}. Thank you for being a member. If you want to come back, your account stays put and resubscribing takes a minute." CTA `[ View plans ]` → `/membership`. |
| `PlanChangedEmail` | `Your plan changed: {oldTier} to {newTier}` | `Your {newTier} benefits are active now.` | "Hello {name}, your membership changed from {oldTier} to {newTier}. Your new hours allowance is {n} (effective immediately, prorated by Stripe). Renews on {date}." CTA `[ View dashboard ]`. |

### Admin templates

Simpler templates, plain serif on cream, no marketing chrome, no CTAs. Mirrors `booking-notification.tsx` style.

| Template | Subject | Body |
|---|---|---|
| `admin/NewMemberNotification` | `New {Tier} member: {name}` | Name, email, tier, monthly amount, subscription ID. |
| `admin/PaymentFailedNotification` | `Payment failed: {name} ({Tier})` | Name, email, tier, last 4 if Stripe provides, retry schedule. |
| `admin/PauseNotification` | `Membership paused: {name} ({Tier})` | Name, email, tier, paused timestamp. |
| `admin/CancelScheduledNotification` | `Cancellation scheduled: {name} ({Tier})` | Name, email, tier, end date. |
| `admin/CancellationFinalNotification` | `Membership ended: {name} ({Tier})` | Name, email, tier, end date. |

### Recipient resolution

Admin recipient resolution order (extends the pattern from `src/lib/admin.ts`):

1. `MEMBERSHIP_ADMIN_NOTIFY_EMAIL` env var if set.
2. Fall back to `BOOKING_ADMIN_NOTIFY_EMAIL` (existing booking-notification recipient).
3. Final fallback: first email in `ADMIN_EMAILS` env var.

Documented in CLAUDE.md alongside the existing email env vars.

## Testing strategy

### Unit (Vitest, jsdom)

**`src/lib/membership/__tests__/lifecycle-transitions.test.ts`** — table-driven, one test per transition rule above. Inputs: `{ event, priorRow, updatedRow, tierSlugLookup }`. Assertions: transition discriminator + payload fields. Includes:

- Fresh insert → `activated`
- Admin-overlap upgrade → `activated`
- All four `subscription.updated` transitions (`paused`, `resumed`, `cancel_scheduled`, `cancel_reversed`)
- Plan change with no other flip → `plan_changed`
- Plan change concurrent with pause flip → `paused` wins
- `cap=true` already prior → `noop` (not re-fired)
- `invoice.paid` with identical period → `noop`
- `invoice.paid` with rolled period → `renewed`
- `invoice.payment_failed` from active → `payment_failed`
- `invoice.payment_failed` from `past_due` → `noop`

**`src/lib/membership/__tests__/lifecycle-notifier.test.ts`** — mocks Resend's `emails.send`. Per transition variant:

- Asserts the expected template module is invoked with the expected props (member + admin where applicable)
- Idempotency: second call with same `(event_id, transition, recipient)` does NOT call Resend
- Resend 5xx → log row is DELETEd; no throw
- Resend 4xx → log row DELETEd, `permanent_failure` warning logged
- Missing member email → returns early; admin send still attempted
- DB insert failure → log + skip both sends

**`src/lib/membership/__tests__/portal-snapshot.test.ts`** — every diff path; sessionStorage round-trip; `consume()` clears the entry.

**`src/components/members/__tests__/MembershipBanner.test.tsx`**:

- Renders nothing when `status='active' && !cancelAtPeriodEnd`
- Each of past_due / paused / pending-cancel renders the right variant with correct copy
- Action button click invokes the expected handler

**`src/components/members/__tests__/WelcomeBanner.test.tsx`**:

- Renders only when `?welcome=1` AND localStorage flag unset
- Dismiss button writes localStorage; banner hides
- After dismissal, `?welcome=1` does not re-render the banner

**`src/emails/membership/__tests__/*.test.tsx`** — render-to-html + structural snapshot per template; preview-prop sanity test.

**`src/app/api/webhooks/__tests__/stripe.test.ts`** (extend) — assert `notifyLifecycle` is invoked exactly once per event with the expected transition kind. Use existing Stripe sample-event fixtures.

### Manual / visual QA

- Sign up → checkout (mock) → land on dashboard → toast fires + welcome card appears → dismiss → reload → card gone, no toast
- Pause via PlanManager → toast fires + amber banner appears on every `/members/*` page → resume → toast fires + banner gone
- Trigger `Update card (simulate decline)` in mock portal → red `past_due` banner appears on every `/members/*` page → trigger `invoice.paid` recovery → banner gone
- Trigger `Cancel subscription` in mock portal → return to settings → snapshot-diff toast + amber `pending-cancel` banner on every `/members/*` page → trigger reactivate → toast + banner gone
- Trigger plan change in mock portal → return to settings → `Plan changed to {tier}` toast
- Replay any webhook (re-click the simulate-portal button) → no duplicate emails, no duplicate toasts, banners stay correct

### Email visual QA

`react-email preview` server (already used for booking emails) for the eight member templates and five admin templates.

## Implementation order

Each stage stands alone and ships testable value. The plan skill will turn these into discrete tasks.

1. **Migration**: `lifecycle_email_log` table + RLS (service-role-only).
2. **`lifecycle-transitions.ts`**: pure detection logic + tests (TDD).
3. **`lifecycle-notifier.ts` skeleton + idempotency wrapper**: no email sends yet, just the log-table guard. Tests with mocked sends.
4. **Member email templates** (eight files) + `react-email` previews + render snapshot tests.
5. **Admin email templates** (five files) + tests.
6. **Wire `notifyLifecycle` into `webhook-handler.ts`**: each handler now calls it after the DB write. Existing webhook tests extended.
7. **Portal-snapshot helper + tests**.
8. **`MembershipBanner` + `WelcomeBanner` components + tests**.
9. **Mount banners in `members/layout.tsx`**.
10. **`dashboard/page.tsx`**: read `?welcome=1`, fire toast, replace URL.
11. **`PlanManager.tsx`**: pause/resume success toasts + `stashPortalSnapshot` before portal navigation.
12. **`settings/page.tsx`**: consume snapshot + diff-toast on mount (with brief poll for late webhooks).
13. **`simulate-portal/page.tsx`**: add `evt_mock_<uuid>` to all `fireWebhook` bodies (idempotency keys for dev/staging).
14. **End-to-end manual QA via mock portal** across all transitions.
15. **CLAUDE.md update**: new env var, new patterns section for lifecycle notifications, file inventory updates.

## Skill usage during implementation

- **`/test-driven-development` is the default for every code stage** (transitions, notifier, portal-snapshot, banners, page integrations). Tests first, watch them fail, implement to green, refactor. The transition-detection and idempotency-log pieces are particularly well-suited to TDD because both are pure-ish logic with table-driven expectations.
- `/frontend-design` — invoke when styling `MembershipBanner`, `WelcomeBanner`, and the email templates (visible static surfaces with brass-on-charcoal app-side and serif-on-cream email-side).
