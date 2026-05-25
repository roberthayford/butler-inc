# Membership Lifecycle Confirmations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface every membership lifecycle transition (activation, renewal, payment failed, pause/resume, cancellation scheduled/final, plan change) through an in-app surface AND a transactional email, driven entirely by the existing webhook handlers.

**Architecture:** A `LifecycleNotifier` orchestrator is called from each webhook handler in `src/lib/payment/webhook-handler.ts` after the DB write. It uses a new `lifecycle_email_log` table (insert-first send-second pattern) for idempotency under Stripe webhook retries. Eight member-facing react-email templates and five admin-facing ones live under `src/emails/membership/`. In-app surfaces are a `<MembershipBanner />` (rendered from `members/layout.tsx`, visible across all `/members/*` pages) plus a one-shot `<WelcomeBanner />` and sonner toasts for direct actions.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Vitest + jsdom + Testing Library, Supabase (Postgres), Resend, `@react-email/components`, sonner, Tailwind v4.

**Spec:** [`docs/superpowers/specs/2026-05-25-membership-lifecycle-confirmations-design.md`](../specs/2026-05-25-membership-lifecycle-confirmations-design.md)

**TDD note:** Use `/test-driven-development` for every code task. Tests first; verify the failure mode; minimal implementation; verify green; commit.

---

## File structure

### New files

| Path | Responsibility |
|---|---|
| `supabase/migrations/011_lifecycle_email_log.sql` | Idempotency table + RLS (service-role only) |
| `src/lib/membership/lifecycle-transitions.ts` | Pure `detectTransition({ event, priorRow, updatedRow, tierSlugLookup }) → Transition` |
| `src/lib/membership/lifecycle-notifier.ts` | Orchestrator: idempotency-log INSERT, render template, Resend send, error/retry handling |
| `src/lib/membership/admin-recipient.ts` | Resolves admin email from env var fallbacks |
| `src/lib/membership/portal-snapshot.ts` | sessionStorage-backed pre/post portal snapshot + diff |
| `src/emails/membership/components/MembershipEmailLayout.tsx` | Shared layout for the eight member emails |
| `src/emails/membership/WelcomeEmail.tsx` | First activation |
| `src/emails/membership/RenewalReceiptEmail.tsx` | Period rolled |
| `src/emails/membership/PaymentFailedEmail.tsx` | `past_due` |
| `src/emails/membership/PauseConfirmedEmail.tsx` | Paused |
| `src/emails/membership/ResumeConfirmedEmail.tsx` | Resumed |
| `src/emails/membership/CancellationScheduledEmail.tsx` | `cancel_at_period_end=true` |
| `src/emails/membership/CancellationFinalEmail.tsx` | Cancelled |
| `src/emails/membership/PlanChangedEmail.tsx` | Tier swapped |
| `src/emails/membership/admin/AdminEmailLayout.tsx` | Shared layout for the five admin emails |
| `src/emails/membership/admin/NewMemberNotification.tsx` | New activation |
| `src/emails/membership/admin/PaymentFailedNotification.tsx` | Payment failed |
| `src/emails/membership/admin/PauseNotification.tsx` | Self-serve pause |
| `src/emails/membership/admin/CancelScheduledNotification.tsx` | Self-serve cancel scheduled |
| `src/emails/membership/admin/CancellationFinalNotification.tsx` | Cancellation final |
| `src/components/members/MembershipBanner.tsx` | Persistent status banner for past_due / paused / pending-cancel |
| `src/components/members/WelcomeBanner.tsx` | One-shot welcome card after activation |

### Test files (mirror each source path under `__tests__/`)

`src/lib/membership/__tests__/lifecycle-transitions.test.ts`, `lifecycle-notifier.test.ts`, `admin-recipient.test.ts`, `portal-snapshot.test.ts`; `src/emails/membership/__tests__/<each>.test.tsx`; `src/components/members/__tests__/MembershipBanner.test.tsx`, `WelcomeBanner.test.tsx`.

### Modified files

| Path | Change |
|---|---|
| `src/lib/payment/webhook-handler.ts` | After each handler's DB UPDATE/INSERT, call `notifyLifecycle(...)` wrapped in try/catch (errors logged, never rethrown) |
| `src/app/api/webhooks/stripe/__tests__/route.test.ts` | Extend with `notifyLifecycle` invocation assertions |
| `src/app/members/layout.tsx` | Mount `<MembershipBanner />` + `<WelcomeBanner />` (wrapped in `<Suspense>` for `useSearchParams`) |
| `src/app/members/dashboard/page.tsx` | Read `?welcome=1`, fire `toast.success`, `router.replace('/members/dashboard')` |
| `src/components/membership/PlanManager.tsx` | Add success toasts on pause/resume; `stashPortalSnapshot(membership)` before portal navigation |
| `src/app/members/settings/page.tsx` | On mount: `consumePortalSnapshot()`, diff vs current membership (with 5s poll fallback), toast |
| `src/app/payment/simulate-portal/page.tsx` | Add `id: \`evt_mock_${crypto.randomUUID()}\`` to every `fireWebhook` body |
| `CLAUDE.md` | Document `MEMBERSHIP_ADMIN_NOTIFY_EMAIL`, the lifecycle-notifier pattern, the new file inventory |

---

## Task 1: Migration — `lifecycle_email_log` table

**Files:**
- Create: `supabase/migrations/011_lifecycle_email_log.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Idempotency log for membership lifecycle emails. Insert-first send-second:
-- the notifier inserts (event_id, transition, recipient) with ON CONFLICT DO
-- NOTHING; if the row is returned the notifier is the unique sender for that
-- triple. On Resend success the row is UPDATEd with resend_id; on Resend
-- transient failure (5xx/network) the row is DELETEd so the next Stripe
-- webhook retry can re-attempt; on permanent failure (4xx) the row is kept
-- to prevent a retry storm.
--
-- No public grants; service role only (matches the rest of the membership
-- infrastructure).

CREATE TABLE lifecycle_email_log (
  event_id     text        NOT NULL,
  transition   text        NOT NULL,
  recipient    text        NOT NULL CHECK (recipient IN ('member', 'admin')),
  sent_at      timestamptz NOT NULL DEFAULT now(),
  resend_id    text,
  PRIMARY KEY (event_id, transition, recipient)
);

ALTER TABLE lifecycle_email_log ENABLE ROW LEVEL SECURITY;
```

- [ ] **Step 2: Apply the migration in local dev**

Run: `psql "$DATABASE_URL" -f supabase/migrations/011_lifecycle_email_log.sql`
Expected: `CREATE TABLE` then `ALTER TABLE` with no errors.

- [ ] **Step 3: Verify the table exists**

Run: `psql "$DATABASE_URL" -c '\d lifecycle_email_log'`
Expected: shows columns `event_id`, `transition`, `recipient`, `sent_at`, `resend_id`, the composite PK, and `Row Security: enabled`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/011_lifecycle_email_log.sql
git commit -m "feat(membership): add lifecycle_email_log idempotency table"
```

---

## Task 2: `lifecycle-transitions.ts` — pure detection (TDD)

**Files:**
- Create: `src/lib/membership/lifecycle-transitions.ts`
- Test: `src/lib/membership/__tests__/lifecycle-transitions.test.ts`

- [ ] **Step 1: Write the failing test (table-driven)**

```ts
// src/lib/membership/__tests__/lifecycle-transitions.test.ts
import { describe, it, expect } from "vitest";
import { detectTransition, type MembershipRow } from "../lifecycle-transitions";
import type { WebhookEvent } from "@/lib/payment/types";

function row(overrides: Partial<MembershipRow> = {}): MembershipRow {
  return {
    id: "m1",
    user_id: "u1",
    status: "active",
    tier_id: "tier-lite",
    cancel_at_period_end: false,
    billing_period_end: "2026-06-25T00:00:00.000Z",
    stripe_subscription_id: "sub_123",
    updated_at: "2026-05-25T10:00:00.000Z",
    personal_hours_total: 10,
    virtual_tasks_total: 5,
    ...overrides,
  };
}

const lookup = (id: string | null) =>
  id === "tier-lite" ? "lite"
  : id === "tier-frequent" ? "frequent"
  : id === "tier-pro" ? "pro"
  : "lite";

describe("detectTransition", () => {
  it("fresh checkout insert → activated", () => {
    const event: WebhookEvent = {
      type: "checkout.session.completed",
      created: 1716_000_000,
      data: {
        id: "cs_1", client_reference_id: "u1", customer: "cus_1", subscription: "sub_123",
        current_period_start: 1716_000_000, current_period_end: 1718_000_000,
        line_items: [{ price: { id: "mock_lite" } }],
      },
    };
    const t = detectTransition({ event, priorRow: null, updatedRow: row(), tierSlugLookup: lookup });
    expect(t).toMatchObject({ kind: "activated", tierSlug: "lite", hoursTotal: 10, tasksTotal: 5 });
  });

  it("admin-overlap upgrade (existing row gained stripe_subscription_id) → activated", () => {
    const event: WebhookEvent = {
      type: "checkout.session.completed",
      created: 1716_000_000,
      data: {
        id: "cs_1", client_reference_id: "u1", customer: "cus_1", subscription: "sub_123",
        current_period_start: 1716_000_000, current_period_end: 1718_000_000,
        line_items: [{ price: { id: "mock_lite" } }],
      },
    };
    const prior = row({ stripe_subscription_id: null });
    const t = detectTransition({ event, priorRow: prior, updatedRow: row(), tierSlugLookup: lookup });
    expect(t.kind).toBe("activated");
  });

  it("subscription.updated active → paused", () => {
    const event: WebhookEvent = {
      type: "customer.subscription.updated", created: 1716_000_000,
      data: { id: "sub_123", customer: "cus_1", status: "paused",
        cancel_at_period_end: false, current_period_start: 0, current_period_end: 0,
        pause_collection: { behavior: "keep_as_draft" }, items: { data: [{ price: { id: "mock_lite" } }] } },
    };
    const prior = row({ status: "active" });
    const updated = row({ status: "paused" });
    const t = detectTransition({ event, priorRow: prior, updatedRow: updated, tierSlugLookup: lookup });
    expect(t).toEqual({ kind: "paused", tierSlug: "lite" });
  });

  it("subscription.updated paused → active → resumed", () => {
    const event: WebhookEvent = {
      type: "customer.subscription.updated", created: 1716_000_000,
      data: { id: "sub_123", customer: "cus_1", status: "active",
        cancel_at_period_end: false, current_period_start: 0, current_period_end: 0,
        pause_collection: null, items: { data: [{ price: { id: "mock_lite" } }] } },
    };
    const prior = row({ status: "paused" });
    const updated = row({ status: "active" });
    expect(detectTransition({ event, priorRow: prior, updatedRow: updated, tierSlugLookup: lookup }))
      .toEqual({ kind: "resumed", tierSlug: "lite" });
  });

  it("subscription.updated cap false→true → cancel_scheduled", () => {
    const event: WebhookEvent = {
      type: "customer.subscription.updated", created: 1716_000_000,
      data: { id: "sub_123", customer: "cus_1", status: "active",
        cancel_at_period_end: true, current_period_start: 0, current_period_end: 0,
        pause_collection: null, items: { data: [{ price: { id: "mock_lite" } }] } },
    };
    const prior = row({ cancel_at_period_end: false });
    const updated = row({ cancel_at_period_end: true, billing_period_end: "2026-06-25T00:00:00.000Z" });
    expect(detectTransition({ event, priorRow: prior, updatedRow: updated, tierSlugLookup: lookup }))
      .toMatchObject({ kind: "cancel_scheduled", tierSlug: "lite", endsAt: "2026-06-25T00:00:00.000Z" });
  });

  it("subscription.updated cap true→false → cancel_reversed", () => {
    const event: WebhookEvent = {
      type: "customer.subscription.updated", created: 1716_000_000,
      data: { id: "sub_123", customer: "cus_1", status: "active",
        cancel_at_period_end: false, current_period_start: 0, current_period_end: 0,
        pause_collection: null, items: { data: [{ price: { id: "mock_lite" } }] } },
    };
    const prior = row({ cancel_at_period_end: true });
    const updated = row({ cancel_at_period_end: false });
    expect(detectTransition({ event, priorRow: prior, updatedRow: updated, tierSlugLookup: lookup }))
      .toEqual({ kind: "cancel_reversed", tierSlug: "lite" });
  });

  it("subscription.updated tier changed → plan_changed", () => {
    const event: WebhookEvent = {
      type: "customer.subscription.updated", created: 1716_000_000,
      data: { id: "sub_123", customer: "cus_1", status: "active",
        cancel_at_period_end: false, current_period_start: 0, current_period_end: 1718_000_000,
        pause_collection: null, items: { data: [{ price: { id: "mock_pro" } }] } },
    };
    const prior = row({ tier_id: "tier-lite" });
    const updated = row({ tier_id: "tier-pro", personal_hours_total: 55 });
    expect(detectTransition({ event, priorRow: prior, updatedRow: updated, tierSlugLookup: lookup }))
      .toMatchObject({ kind: "plan_changed", fromTierSlug: "lite", toTierSlug: "pro", newHoursTotal: 55 });
  });

  it("subscription.updated plan change AND pause flip → paused wins", () => {
    const event: WebhookEvent = {
      type: "customer.subscription.updated", created: 1716_000_000,
      data: { id: "sub_123", customer: "cus_1", status: "paused",
        cancel_at_period_end: false, current_period_start: 0, current_period_end: 0,
        pause_collection: { behavior: "keep_as_draft" },
        items: { data: [{ price: { id: "mock_pro" } }] } },
    };
    const prior = row({ status: "active", tier_id: "tier-lite" });
    const updated = row({ status: "paused", tier_id: "tier-pro" });
    expect(detectTransition({ event, priorRow: prior, updatedRow: updated, tierSlugLookup: lookup }).kind)
      .toBe("paused");
  });

  it("subscription.updated cap already true on both sides → noop", () => {
    const event: WebhookEvent = {
      type: "customer.subscription.updated", created: 1716_000_000,
      data: { id: "sub_123", customer: "cus_1", status: "active",
        cancel_at_period_end: true, current_period_start: 0, current_period_end: 0,
        pause_collection: null, items: { data: [{ price: { id: "mock_lite" } }] } },
    };
    const prior = row({ cancel_at_period_end: true });
    const updated = row({ cancel_at_period_end: true });
    expect(detectTransition({ event, priorRow: prior, updatedRow: updated, tierSlugLookup: lookup }))
      .toEqual({ kind: "noop" });
  });

  it("subscription.deleted → cancelled", () => {
    const event: WebhookEvent = {
      type: "customer.subscription.deleted", created: 1716_000_000,
      data: { id: "sub_123", customer: "cus_1", status: "canceled",
        cancel_at_period_end: false, current_period_start: 0, current_period_end: 0,
        pause_collection: null, items: { data: [] } },
    };
    expect(detectTransition({ event, priorRow: row(), updatedRow: row({ status: "cancelled" }), tierSlugLookup: lookup }))
      .toEqual({ kind: "cancelled", tierSlug: "lite" });
  });

  it("invoice.paid with identical period → noop", () => {
    const event: WebhookEvent = {
      type: "invoice.paid", created: 1716_000_000,
      data: { id: "in_1", customer: "cus_1", subscription: "sub_123",
        period_start: 0, period_end: 1716_000_000, status: "paid" },
    };
    const prior = row({ billing_period_end: "2026-06-25T00:00:00.000Z" });
    const updated = row({ billing_period_end: "2026-06-25T00:00:00.000Z" });
    expect(detectTransition({ event, priorRow: prior, updatedRow: updated, tierSlugLookup: lookup }))
      .toEqual({ kind: "noop" });
  });

  it("invoice.paid with rolled period → renewed (monthlyPrice from tier)", () => {
    const event: WebhookEvent = {
      type: "invoice.paid", created: 1716_000_000,
      data: { id: "in_1", customer: "cus_1", subscription: "sub_123",
        period_start: 0, period_end: 1720_000_000, status: "paid" },
    };
    const prior = row({ billing_period_end: "2026-05-25T00:00:00.000Z" });
    const updated = row({ billing_period_end: "2026-06-25T00:00:00.000Z" });
    expect(detectTransition({ event, priorRow: prior, updatedRow: updated, tierSlugLookup: lookup }))
      .toMatchObject({ kind: "renewed", tierSlug: "lite", periodEnd: "2026-06-25T00:00:00.000Z", monthlyPrice: 500 });
  });

  it("invoice.payment_failed active → past_due → payment_failed", () => {
    const event: WebhookEvent = {
      type: "invoice.payment_failed", created: 1716_000_000,
      data: { id: "in_1", customer: "cus_1", subscription: "sub_123",
        period_start: 0, period_end: 0, status: "open" },
    };
    const prior = row({ status: "active" });
    const updated = row({ status: "past_due" });
    expect(detectTransition({ event, priorRow: prior, updatedRow: updated, tierSlugLookup: lookup }))
      .toEqual({ kind: "payment_failed", tierSlug: "lite" });
  });

  it("invoice.payment_failed already past_due → noop", () => {
    const event: WebhookEvent = {
      type: "invoice.payment_failed", created: 1716_000_000,
      data: { id: "in_1", customer: "cus_1", subscription: "sub_123",
        period_start: 0, period_end: 0, status: "open" },
    };
    const prior = row({ status: "past_due" });
    const updated = row({ status: "past_due" });
    expect(detectTransition({ event, priorRow: prior, updatedRow: updated, tierSlugLookup: lookup }))
      .toEqual({ kind: "noop" });
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npm run test:run -- src/lib/membership/__tests__/lifecycle-transitions.test.ts`
Expected: cannot find module `../lifecycle-transitions`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/membership/lifecycle-transitions.ts
import type { WebhookEvent } from "@/lib/payment/types";
import { MEMBERSHIP_TIERS } from "@/data/membership-config";
import type { TierSlug } from "@/types/membership";

export type MembershipRow = {
  id: string;
  user_id: string;
  status: string;
  tier_id: string | null;
  cancel_at_period_end: boolean;
  billing_period_end: string;
  stripe_subscription_id: string | null;
  updated_at: string;
  personal_hours_total: number;
  virtual_tasks_total: number;
};

export type Transition =
  | { kind: "activated"; tierSlug: TierSlug; hoursTotal: number; tasksTotal: number; renewsAt: string }
  | { kind: "renewed"; tierSlug: TierSlug; periodEnd: string; monthlyPrice: number }
  | { kind: "payment_failed"; tierSlug: TierSlug }
  | { kind: "paused"; tierSlug: TierSlug }
  | { kind: "resumed"; tierSlug: TierSlug }
  | { kind: "cancel_scheduled"; tierSlug: TierSlug; endsAt: string }
  | { kind: "cancel_reversed"; tierSlug: TierSlug }
  | { kind: "cancelled"; tierSlug: TierSlug }
  | { kind: "plan_changed"; fromTierSlug: TierSlug; toTierSlug: TierSlug; newHoursTotal: number; renewsAt: string }
  | { kind: "noop" };

export interface DetectArgs {
  event: WebhookEvent;
  priorRow: MembershipRow | null;
  updatedRow: MembershipRow;
  tierSlugLookup: (tierId: string | null) => TierSlug;
}

export function detectTransition({ event, priorRow, updatedRow, tierSlugLookup }: DetectArgs): Transition {
  const tierSlug = tierSlugLookup(updatedRow.tier_id);

  switch (event.type) {
    case "checkout.session.completed": {
      // Fresh insert (no prior row) OR admin-overlap upgrade (prior had no sub_id)
      const wasUnattached = priorRow !== null && priorRow.stripe_subscription_id === null;
      if (priorRow === null || wasUnattached) {
        return {
          kind: "activated",
          tierSlug,
          hoursTotal: updatedRow.personal_hours_total,
          tasksTotal: updatedRow.virtual_tasks_total,
          renewsAt: updatedRow.billing_period_end,
        };
      }
      return { kind: "noop" };
    }

    case "customer.subscription.updated": {
      if (!priorRow) return { kind: "noop" };
      // Priority order: paused > resumed > cancel_scheduled > cancel_reversed > plan_changed
      if (priorRow.status !== "paused" && updatedRow.status === "paused") {
        return { kind: "paused", tierSlug };
      }
      if (priorRow.status === "paused" && updatedRow.status !== "paused") {
        return { kind: "resumed", tierSlug };
      }
      if (!priorRow.cancel_at_period_end && updatedRow.cancel_at_period_end) {
        return { kind: "cancel_scheduled", tierSlug, endsAt: updatedRow.billing_period_end };
      }
      if (priorRow.cancel_at_period_end && !updatedRow.cancel_at_period_end) {
        return { kind: "cancel_reversed", tierSlug };
      }
      if (priorRow.tier_id !== updatedRow.tier_id) {
        const fromTierSlug = tierSlugLookup(priorRow.tier_id);
        return {
          kind: "plan_changed",
          fromTierSlug,
          toTierSlug: tierSlug,
          newHoursTotal: updatedRow.personal_hours_total,
          renewsAt: updatedRow.billing_period_end,
        };
      }
      return { kind: "noop" };
    }

    case "customer.subscription.deleted":
      return { kind: "cancelled", tierSlug };

    case "invoice.paid": {
      if (!priorRow) return { kind: "noop" };
      if (priorRow.billing_period_end === updatedRow.billing_period_end) return { kind: "noop" };
      const tier = MEMBERSHIP_TIERS.find((t) => t.slug === tierSlug);
      return {
        kind: "renewed",
        tierSlug,
        periodEnd: updatedRow.billing_period_end,
        monthlyPrice: tier?.monthlyPrice ?? 0,
      };
    }

    case "invoice.payment_failed": {
      if (priorRow?.status === "past_due") return { kind: "noop" };
      return { kind: "payment_failed", tierSlug };
    }

    case "unhandled":
      return { kind: "noop" };
  }
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npm run test:run -- src/lib/membership/__tests__/lifecycle-transitions.test.ts`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/membership/lifecycle-transitions.ts src/lib/membership/__tests__/lifecycle-transitions.test.ts
git commit -m "feat(membership): add lifecycle transition detection"
```

---

## Task 3: Admin recipient resolver

**Files:**
- Create: `src/lib/membership/admin-recipient.ts`
- Test: `src/lib/membership/__tests__/admin-recipient.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/membership/__tests__/admin-recipient.test.ts
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveAdminRecipient } from "../admin-recipient";

const SAVED = {
  M: process.env.MEMBERSHIP_ADMIN_NOTIFY_EMAIL,
  B: process.env.BOOKING_ADMIN_NOTIFY_EMAIL,
  A: process.env.ADMIN_EMAILS,
};

describe("resolveAdminRecipient", () => {
  beforeEach(() => {
    delete process.env.MEMBERSHIP_ADMIN_NOTIFY_EMAIL;
    delete process.env.BOOKING_ADMIN_NOTIFY_EMAIL;
    delete process.env.ADMIN_EMAILS;
  });
  afterEach(() => {
    process.env.MEMBERSHIP_ADMIN_NOTIFY_EMAIL = SAVED.M;
    process.env.BOOKING_ADMIN_NOTIFY_EMAIL = SAVED.B;
    process.env.ADMIN_EMAILS = SAVED.A;
  });

  it("prefers MEMBERSHIP_ADMIN_NOTIFY_EMAIL", () => {
    process.env.MEMBERSHIP_ADMIN_NOTIFY_EMAIL = "memberships@x";
    process.env.BOOKING_ADMIN_NOTIFY_EMAIL = "bookings@x";
    process.env.ADMIN_EMAILS = "a@x,b@x";
    expect(resolveAdminRecipient()).toBe("memberships@x");
  });

  it("falls back to BOOKING_ADMIN_NOTIFY_EMAIL", () => {
    process.env.BOOKING_ADMIN_NOTIFY_EMAIL = "bookings@x";
    process.env.ADMIN_EMAILS = "a@x,b@x";
    expect(resolveAdminRecipient()).toBe("bookings@x");
  });

  it("falls back to first ADMIN_EMAILS entry", () => {
    process.env.ADMIN_EMAILS = "a@x , b@x";
    expect(resolveAdminRecipient()).toBe("a@x");
  });

  it("returns null when nothing is set", () => {
    expect(resolveAdminRecipient()).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npm run test:run -- src/lib/membership/__tests__/admin-recipient.test.ts`
Expected: cannot find module `../admin-recipient`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/membership/admin-recipient.ts
export function resolveAdminRecipient(): string | null {
  const m = process.env.MEMBERSHIP_ADMIN_NOTIFY_EMAIL?.trim();
  if (m) return m;
  const b = process.env.BOOKING_ADMIN_NOTIFY_EMAIL?.trim();
  if (b) return b;
  const list = process.env.ADMIN_EMAILS;
  if (list) {
    const first = list.split(",")[0]?.trim();
    if (first) return first;
  }
  return null;
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npm run test:run -- src/lib/membership/__tests__/admin-recipient.test.ts`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/membership/admin-recipient.ts src/lib/membership/__tests__/admin-recipient.test.ts
git commit -m "feat(membership): add admin recipient resolver"
```

---

## Task 4: Shared member email layout

**Files:**
- Create: `src/emails/membership/components/MembershipEmailLayout.tsx`
- Test: `src/emails/membership/__tests__/MembershipEmailLayout.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/emails/membership/__tests__/MembershipEmailLayout.test.tsx
import { describe, it, expect } from "vitest";
import { render } from "@react-email/components";
import { MembershipEmailLayout } from "../components/MembershipEmailLayout";

describe("MembershipEmailLayout", () => {
  it("renders preview text and body children", async () => {
    const html = await render(
      <MembershipEmailLayout preview="Hello world" heading="Heading">
        <p>Body paragraph</p>
      </MembershipEmailLayout>
    );
    expect(html).toContain("Hello world");
    expect(html).toContain("Heading");
    expect(html).toContain("Body paragraph");
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npm run test:run -- src/emails/membership/__tests__/MembershipEmailLayout.test.tsx`
Expected: cannot find module.

- [ ] **Step 3: Write the implementation**

```tsx
// src/emails/membership/components/MembershipEmailLayout.tsx
import {
  Body, Container, Head, Html, Preview, Section, Text,
} from "@react-email/components";
import { EmailHeader } from "@/emails/components/EmailHeader";
import { EmailFooter } from "@/emails/components/EmailFooter";

interface Props {
  preview: string;
  heading: string;
  children: React.ReactNode;
}

export function MembershipEmailLayout({ preview, heading, children }: Props) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: "#FCFBF9", margin: 0, padding: "40px 0" }}>
        <Container
          style={{
            maxWidth: "560px",
            margin: "0 auto",
            backgroundColor: "#FCFBF9",
            borderRadius: "4px",
            overflow: "hidden",
            boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
          }}
        >
          <EmailHeader />
          <Section style={{ padding: "36px 40px 24px" }}>
            <Text
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontSize: "26px",
                color: "#262F3D",
                margin: "0 0 16px",
                fontWeight: "normal",
                lineHeight: "1.3",
              }}
            >
              {heading}
            </Text>
            {children}
          </Section>
          <EmailFooter />
        </Container>
      </Body>
    </Html>
  );
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npm run test:run -- src/emails/membership/__tests__/MembershipEmailLayout.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/emails/membership/components/MembershipEmailLayout.tsx src/emails/membership/__tests__/MembershipEmailLayout.test.tsx
git commit -m "feat(emails): add shared membership email layout"
```

---

## Task 5: `WelcomeEmail`

**Files:**
- Create: `src/emails/membership/WelcomeEmail.tsx`
- Test: `src/emails/membership/__tests__/WelcomeEmail.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/emails/membership/__tests__/WelcomeEmail.test.tsx
import { describe, it, expect } from "vitest";
import { render } from "@react-email/components";
import { WelcomeEmail } from "../WelcomeEmail";

const props = { name: "Ada Lovelace", tierName: "Lite", hoursTotal: 10, tasksTotal: 5, renewsAt: "25 Jun 2026" };

describe("WelcomeEmail", () => {
  it("includes tier name, hours and tasks counts, and the dashboard CTA URL", async () => {
    const html = await render(<WelcomeEmail {...props} />);
    expect(html).toContain("Welcome to Butlers Inc Lite");
    expect(html).toContain("10 personal butler hours");
    expect(html).toContain("5 virtual tasks");
    expect(html).toContain("25 Jun 2026");
    expect(html).toContain("/members/dashboard");
  });
  it("uses the member's name in the greeting", async () => {
    const html = await render(<WelcomeEmail {...props} />);
    expect(html).toContain("Hello Ada");
  });
  it("has no em dashes", async () => {
    const html = await render(<WelcomeEmail {...props} />);
    expect(html).not.toContain("—");
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npm run test:run -- src/emails/membership/__tests__/WelcomeEmail.test.tsx`
Expected: cannot find module.

- [ ] **Step 3: Write the implementation**

```tsx
// src/emails/membership/WelcomeEmail.tsx
import { Button, Text } from "@react-email/components";
import { MembershipEmailLayout } from "./components/MembershipEmailLayout";

export interface WelcomeEmailProps {
  name: string;
  tierName: string;
  hoursTotal: number;
  tasksTotal: number;
  renewsAt: string;
}

export function WelcomeEmail({ name, tierName, hoursTotal, tasksTotal, renewsAt }: WelcomeEmailProps) {
  const greetingName = name.split(" ")[0] ?? name;
  return (
    <MembershipEmailLayout
      preview={`Your ${hoursTotal} hours are ready. Here's where to start.`}
      heading={`Welcome to Butlers Inc ${tierName}`}
    >
      <Text style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: "15px", color: "#4A5568", lineHeight: "1.6", margin: "0 0 18px" }}>
        Hello {greetingName}, your {tierName} membership is active. You have {hoursTotal} personal butler hours and {tasksTotal} virtual tasks available this period. Renews on {renewsAt}.
      </Text>
      <Button
        href="https://butlersinc.com/members/dashboard"
        style={{ backgroundColor: "#B3895D", color: "#FCFBF9", padding: "12px 20px", borderRadius: "4px", fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: "14px", textDecoration: "none" }}
      >
        Book your first butler
      </Button>
    </MembershipEmailLayout>
  );
}

WelcomeEmail.PreviewProps = {
  name: "Ada Lovelace", tierName: "Lite", hoursTotal: 10, tasksTotal: 5, renewsAt: "25 Jun 2026",
} satisfies WelcomeEmailProps;

export default WelcomeEmail;
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npm run test:run -- src/emails/membership/__tests__/WelcomeEmail.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/emails/membership/WelcomeEmail.tsx src/emails/membership/__tests__/WelcomeEmail.test.tsx
git commit -m "feat(emails): add membership WelcomeEmail template"
```

---

## Task 6: `RenewalReceiptEmail`

**Files:**
- Create: `src/emails/membership/RenewalReceiptEmail.tsx`
- Test: `src/emails/membership/__tests__/RenewalReceiptEmail.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/emails/membership/__tests__/RenewalReceiptEmail.test.tsx
import { describe, it, expect } from "vitest";
import { render } from "@react-email/components";
import { RenewalReceiptEmail } from "../RenewalReceiptEmail";

const props = { name: "Ada", tierName: "Frequent", monthlyPrice: 1000, hoursTotal: 20, tasksTotal: 10, periodEnd: "25 Jul 2026" };

describe("RenewalReceiptEmail", () => {
  it("shows monthly price, hours, tasks, and period end", async () => {
    const html = await render(<RenewalReceiptEmail {...props} />);
    expect(html).toContain("Your Butlers Inc Frequent has renewed");
    expect(html).toContain("£1000");
    expect(html).toContain("20 personal butler hours");
    expect(html).toContain("10 virtual tasks");
    expect(html).toContain("25 Jul 2026");
  });
  it("has no em dashes", async () => {
    const html = await render(<RenewalReceiptEmail {...props} />);
    expect(html).not.toContain("—");
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npm run test:run -- src/emails/membership/__tests__/RenewalReceiptEmail.test.tsx`
Expected: cannot find module.

- [ ] **Step 3: Write the implementation**

```tsx
// src/emails/membership/RenewalReceiptEmail.tsx
import { Text } from "@react-email/components";
import { MembershipEmailLayout } from "./components/MembershipEmailLayout";

export interface RenewalReceiptEmailProps {
  name: string;
  tierName: string;
  monthlyPrice: number;
  hoursTotal: number;
  tasksTotal: number;
  periodEnd: string;
}

export function RenewalReceiptEmail({ name, tierName, monthlyPrice, hoursTotal, tasksTotal, periodEnd }: RenewalReceiptEmailProps) {
  const first = name.split(" ")[0] ?? name;
  return (
    <MembershipEmailLayout
      preview={`£${monthlyPrice} charged. Hours refreshed.`}
      heading={`Your Butlers Inc ${tierName} has renewed`}
    >
      <Text style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: "15px", color: "#4A5568", lineHeight: "1.6", margin: "0 0 12px" }}>
        Hello {first}, your {tierName} membership renewed today. £{monthlyPrice} was charged to the card on file. Your {hoursTotal} personal butler hours and {tasksTotal} virtual tasks are refreshed for the new period (ends {periodEnd}).
      </Text>
    </MembershipEmailLayout>
  );
}

RenewalReceiptEmail.PreviewProps = {
  name: "Ada", tierName: "Frequent", monthlyPrice: 1000, hoursTotal: 20, tasksTotal: 10, periodEnd: "25 Jul 2026",
} satisfies RenewalReceiptEmailProps;

export default RenewalReceiptEmail;
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npm run test:run -- src/emails/membership/__tests__/RenewalReceiptEmail.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/emails/membership/RenewalReceiptEmail.tsx src/emails/membership/__tests__/RenewalReceiptEmail.test.tsx
git commit -m "feat(emails): add RenewalReceiptEmail template"
```

---

## Task 7: `PaymentFailedEmail`

**Files:**
- Create: `src/emails/membership/PaymentFailedEmail.tsx`
- Test: `src/emails/membership/__tests__/PaymentFailedEmail.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/emails/membership/__tests__/PaymentFailedEmail.test.tsx
import { describe, it, expect } from "vitest";
import { render } from "@react-email/components";
import { PaymentFailedEmail } from "../PaymentFailedEmail";

describe("PaymentFailedEmail", () => {
  it("calls out the failure and links to update payment", async () => {
    const html = await render(<PaymentFailedEmail name="Ada" tierName="Pro" />);
    expect(html).toContain("Action needed: payment failed");
    expect(html).toContain("Pro");
    expect(html).toContain("/members/settings");
    expect(html).toContain("Update payment method");
  });
  it("has no em dashes", async () => {
    const html = await render(<PaymentFailedEmail name="Ada" tierName="Pro" />);
    expect(html).not.toContain("—");
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npm run test:run -- src/emails/membership/__tests__/PaymentFailedEmail.test.tsx`
Expected: cannot find module.

- [ ] **Step 3: Write the implementation**

```tsx
// src/emails/membership/PaymentFailedEmail.tsx
import { Button, Text } from "@react-email/components";
import { MembershipEmailLayout } from "./components/MembershipEmailLayout";

export interface PaymentFailedEmailProps {
  name: string;
  tierName: string;
}

export function PaymentFailedEmail({ name, tierName }: PaymentFailedEmailProps) {
  const first = name.split(" ")[0] ?? name;
  return (
    <MembershipEmailLayout
      preview="Update your card to keep your benefits."
      heading={`Action needed: payment failed for your Butlers Inc ${tierName}`}
    >
      <Text style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: "15px", color: "#4A5568", lineHeight: "1.6", margin: "0 0 18px" }}>
        Hello {first}, we couldn&rsquo;t charge your card for your {tierName} membership. Your member benefits are paused until your payment method is updated. We&rsquo;ll retry automatically over the next few days.
      </Text>
      <Button
        href="https://butlersinc.com/members/settings"
        style={{ backgroundColor: "#B3895D", color: "#FCFBF9", padding: "12px 20px", borderRadius: "4px", fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: "14px", textDecoration: "none" }}
      >
        Update payment method
      </Button>
    </MembershipEmailLayout>
  );
}

PaymentFailedEmail.PreviewProps = { name: "Ada", tierName: "Pro" } satisfies PaymentFailedEmailProps;
export default PaymentFailedEmail;
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npm run test:run -- src/emails/membership/__tests__/PaymentFailedEmail.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/emails/membership/PaymentFailedEmail.tsx src/emails/membership/__tests__/PaymentFailedEmail.test.tsx
git commit -m "feat(emails): add PaymentFailedEmail template"
```

---

## Task 8: `PauseConfirmedEmail`

**Files:**
- Create: `src/emails/membership/PauseConfirmedEmail.tsx`
- Test: `src/emails/membership/__tests__/PauseConfirmedEmail.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/emails/membership/__tests__/PauseConfirmedEmail.test.tsx
import { describe, it, expect } from "vitest";
import { render } from "@react-email/components";
import { PauseConfirmedEmail } from "../PauseConfirmedEmail";

describe("PauseConfirmedEmail", () => {
  it("confirms pause and links to settings", async () => {
    const html = await render(<PauseConfirmedEmail name="Ada" tierName="Lite" />);
    expect(html).toContain("Your Butlers Inc Lite is paused");
    expect(html).toContain("Resume membership");
    expect(html).toContain("/members/settings");
  });
  it("has no em dashes", async () => {
    const html = await render(<PauseConfirmedEmail name="Ada" tierName="Lite" />);
    expect(html).not.toContain("—");
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npm run test:run -- src/emails/membership/__tests__/PauseConfirmedEmail.test.tsx`
Expected: cannot find module.

- [ ] **Step 3: Write the implementation**

```tsx
// src/emails/membership/PauseConfirmedEmail.tsx
import { Button, Text } from "@react-email/components";
import { MembershipEmailLayout } from "./components/MembershipEmailLayout";

export interface PauseConfirmedEmailProps { name: string; tierName: string; }

export function PauseConfirmedEmail({ name, tierName }: PauseConfirmedEmailProps) {
  const first = name.split(" ")[0] ?? name;
  return (
    <MembershipEmailLayout
      preview="Billing is suspended. Resume anytime."
      heading={`Your Butlers Inc ${tierName} is paused`}
    >
      <Text style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: "15px", color: "#4A5568", lineHeight: "1.6", margin: "0 0 18px" }}>
        Hello {first}, your {tierName} membership is paused. Billing is suspended and member pricing is unavailable until you resume. Your usage and renewal date pick up where you left off.
      </Text>
      <Button
        href="https://butlersinc.com/members/settings"
        style={{ backgroundColor: "#B3895D", color: "#FCFBF9", padding: "12px 20px", borderRadius: "4px", fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: "14px", textDecoration: "none" }}
      >
        Resume membership
      </Button>
    </MembershipEmailLayout>
  );
}

PauseConfirmedEmail.PreviewProps = { name: "Ada", tierName: "Lite" } satisfies PauseConfirmedEmailProps;
export default PauseConfirmedEmail;
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npm run test:run -- src/emails/membership/__tests__/PauseConfirmedEmail.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/emails/membership/PauseConfirmedEmail.tsx src/emails/membership/__tests__/PauseConfirmedEmail.test.tsx
git commit -m "feat(emails): add PauseConfirmedEmail template"
```

---

## Task 9: `ResumeConfirmedEmail`

**Files:**
- Create: `src/emails/membership/ResumeConfirmedEmail.tsx`
- Test: `src/emails/membership/__tests__/ResumeConfirmedEmail.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/emails/membership/__tests__/ResumeConfirmedEmail.test.tsx
import { describe, it, expect } from "vitest";
import { render } from "@react-email/components";
import { ResumeConfirmedEmail } from "../ResumeConfirmedEmail";

describe("ResumeConfirmedEmail", () => {
  it("confirms resume and links to dashboard", async () => {
    const html = await render(<ResumeConfirmedEmail name="Ada" tierName="Lite" />);
    expect(html).toContain("Welcome back to your Butlers Inc Lite");
    expect(html).toContain("Book a butler");
    expect(html).toContain("/members/dashboard");
  });
  it("has no em dashes", async () => {
    const html = await render(<ResumeConfirmedEmail name="Ada" tierName="Lite" />);
    expect(html).not.toContain("—");
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npm run test:run -- src/emails/membership/__tests__/ResumeConfirmedEmail.test.tsx`
Expected: cannot find module.

- [ ] **Step 3: Write the implementation**

```tsx
// src/emails/membership/ResumeConfirmedEmail.tsx
import { Button, Text } from "@react-email/components";
import { MembershipEmailLayout } from "./components/MembershipEmailLayout";

export interface ResumeConfirmedEmailProps { name: string; tierName: string; }

export function ResumeConfirmedEmail({ name, tierName }: ResumeConfirmedEmailProps) {
  const first = name.split(" ")[0] ?? name;
  return (
    <MembershipEmailLayout
      preview="Hours available, billing resumed."
      heading={`Welcome back to your Butlers Inc ${tierName}`}
    >
      <Text style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: "15px", color: "#4A5568", lineHeight: "1.6", margin: "0 0 18px" }}>
        Hello {first}, your {tierName} membership is active again. Billing resumes today and your hours are available immediately.
      </Text>
      <Button
        href="https://butlersinc.com/members/dashboard"
        style={{ backgroundColor: "#B3895D", color: "#FCFBF9", padding: "12px 20px", borderRadius: "4px", fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: "14px", textDecoration: "none" }}
      >
        Book a butler
      </Button>
    </MembershipEmailLayout>
  );
}

ResumeConfirmedEmail.PreviewProps = { name: "Ada", tierName: "Lite" } satisfies ResumeConfirmedEmailProps;
export default ResumeConfirmedEmail;
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npm run test:run -- src/emails/membership/__tests__/ResumeConfirmedEmail.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/emails/membership/ResumeConfirmedEmail.tsx src/emails/membership/__tests__/ResumeConfirmedEmail.test.tsx
git commit -m "feat(emails): add ResumeConfirmedEmail template"
```

---

## Task 10: `CancellationScheduledEmail`

**Files:**
- Create: `src/emails/membership/CancellationScheduledEmail.tsx`
- Test: `src/emails/membership/__tests__/CancellationScheduledEmail.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/emails/membership/__tests__/CancellationScheduledEmail.test.tsx
import { describe, it, expect } from "vitest";
import { render } from "@react-email/components";
import { CancellationScheduledEmail } from "../CancellationScheduledEmail";

describe("CancellationScheduledEmail", () => {
  it("shows end date and reactivate CTA", async () => {
    const html = await render(<CancellationScheduledEmail name="Ada" tierName="Pro" endsAt="25 Jun 2026" />);
    expect(html).toContain("Your Butlers Inc Pro cancels on 25 Jun 2026");
    expect(html).toContain("Reactivate");
    expect(html).toContain("/members/settings");
  });
  it("has no em dashes", async () => {
    const html = await render(<CancellationScheduledEmail name="Ada" tierName="Pro" endsAt="25 Jun 2026" />);
    expect(html).not.toContain("—");
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npm run test:run -- src/emails/membership/__tests__/CancellationScheduledEmail.test.tsx`
Expected: cannot find module.

- [ ] **Step 3: Write the implementation**

```tsx
// src/emails/membership/CancellationScheduledEmail.tsx
import { Button, Text } from "@react-email/components";
import { MembershipEmailLayout } from "./components/MembershipEmailLayout";

export interface CancellationScheduledEmailProps { name: string; tierName: string; endsAt: string; }

export function CancellationScheduledEmail({ name, tierName, endsAt }: CancellationScheduledEmailProps) {
  const first = name.split(" ")[0] ?? name;
  return (
    <MembershipEmailLayout
      preview="Reactivate before then to keep your slot."
      heading={`Your Butlers Inc ${tierName} cancels on ${endsAt}`}
    >
      <Text style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: "15px", color: "#4A5568", lineHeight: "1.6", margin: "0 0 18px" }}>
        Hello {first}, we&rsquo;ve scheduled your {tierName} cancellation for {endsAt}. You still have access until then, including any remaining hours. Reactivate any time before {endsAt} and nothing changes.
      </Text>
      <Button
        href="https://butlersinc.com/members/settings"
        style={{ backgroundColor: "#B3895D", color: "#FCFBF9", padding: "12px 20px", borderRadius: "4px", fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: "14px", textDecoration: "none" }}
      >
        Reactivate
      </Button>
    </MembershipEmailLayout>
  );
}

CancellationScheduledEmail.PreviewProps = { name: "Ada", tierName: "Pro", endsAt: "25 Jun 2026" } satisfies CancellationScheduledEmailProps;
export default CancellationScheduledEmail;
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npm run test:run -- src/emails/membership/__tests__/CancellationScheduledEmail.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/emails/membership/CancellationScheduledEmail.tsx src/emails/membership/__tests__/CancellationScheduledEmail.test.tsx
git commit -m "feat(emails): add CancellationScheduledEmail template"
```

---

## Task 11: `CancellationFinalEmail`

**Files:**
- Create: `src/emails/membership/CancellationFinalEmail.tsx`
- Test: `src/emails/membership/__tests__/CancellationFinalEmail.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/emails/membership/__tests__/CancellationFinalEmail.test.tsx
import { describe, it, expect } from "vitest";
import { render } from "@react-email/components";
import { CancellationFinalEmail } from "../CancellationFinalEmail";

describe("CancellationFinalEmail", () => {
  it("shows end date and View plans CTA", async () => {
    const html = await render(<CancellationFinalEmail name="Ada" tierName="Frequent" endedAt="25 Jun 2026" />);
    expect(html).toContain("Your Butlers Inc Frequent has ended");
    expect(html).toContain("View plans");
    expect(html).toContain("/membership");
    expect(html).toContain("25 Jun 2026");
  });
  it("has no em dashes", async () => {
    const html = await render(<CancellationFinalEmail name="Ada" tierName="Frequent" endedAt="25 Jun 2026" />);
    expect(html).not.toContain("—");
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npm run test:run -- src/emails/membership/__tests__/CancellationFinalEmail.test.tsx`
Expected: cannot find module.

- [ ] **Step 3: Write the implementation**

```tsx
// src/emails/membership/CancellationFinalEmail.tsx
import { Button, Text } from "@react-email/components";
import { MembershipEmailLayout } from "./components/MembershipEmailLayout";

export interface CancellationFinalEmailProps { name: string; tierName: string; endedAt: string; }

export function CancellationFinalEmail({ name, tierName, endedAt }: CancellationFinalEmailProps) {
  const first = name.split(" ")[0] ?? name;
  return (
    <MembershipEmailLayout
      preview="Thank you. The door's open if you want to return."
      heading={`Your Butlers Inc ${tierName} has ended`}
    >
      <Text style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: "15px", color: "#4A5568", lineHeight: "1.6", margin: "0 0 18px" }}>
        Hello {first}, your {tierName} membership ended on {endedAt}. Thank you for being a member. If you want to come back, your account stays put and resubscribing takes a minute.
      </Text>
      <Button
        href="https://butlersinc.com/membership"
        style={{ backgroundColor: "#B3895D", color: "#FCFBF9", padding: "12px 20px", borderRadius: "4px", fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: "14px", textDecoration: "none" }}
      >
        View plans
      </Button>
    </MembershipEmailLayout>
  );
}

CancellationFinalEmail.PreviewProps = { name: "Ada", tierName: "Frequent", endedAt: "25 Jun 2026" } satisfies CancellationFinalEmailProps;
export default CancellationFinalEmail;
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npm run test:run -- src/emails/membership/__tests__/CancellationFinalEmail.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/emails/membership/CancellationFinalEmail.tsx src/emails/membership/__tests__/CancellationFinalEmail.test.tsx
git commit -m "feat(emails): add CancellationFinalEmail template"
```

---

## Task 12: `PlanChangedEmail`

**Files:**
- Create: `src/emails/membership/PlanChangedEmail.tsx`
- Test: `src/emails/membership/__tests__/PlanChangedEmail.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/emails/membership/__tests__/PlanChangedEmail.test.tsx
import { describe, it, expect } from "vitest";
import { render } from "@react-email/components";
import { PlanChangedEmail } from "../PlanChangedEmail";

const props = { name: "Ada", fromTierName: "Lite", toTierName: "Pro", newHoursTotal: 55, renewsAt: "25 Jun 2026" };

describe("PlanChangedEmail", () => {
  it("shows old and new tier, new hours, renew date", async () => {
    const html = await render(<PlanChangedEmail {...props} />);
    expect(html).toContain("Your plan changed: Lite to Pro");
    expect(html).toContain("Lite to Pro");
    expect(html).toContain("55");
    expect(html).toContain("25 Jun 2026");
  });
  it("has no em dashes", async () => {
    const html = await render(<PlanChangedEmail {...props} />);
    expect(html).not.toContain("—");
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npm run test:run -- src/emails/membership/__tests__/PlanChangedEmail.test.tsx`
Expected: cannot find module.

- [ ] **Step 3: Write the implementation**

```tsx
// src/emails/membership/PlanChangedEmail.tsx
import { Button, Text } from "@react-email/components";
import { MembershipEmailLayout } from "./components/MembershipEmailLayout";

export interface PlanChangedEmailProps {
  name: string;
  fromTierName: string;
  toTierName: string;
  newHoursTotal: number;
  renewsAt: string;
}

export function PlanChangedEmail({ name, fromTierName, toTierName, newHoursTotal, renewsAt }: PlanChangedEmailProps) {
  const first = name.split(" ")[0] ?? name;
  return (
    <MembershipEmailLayout
      preview={`Your ${toTierName} benefits are active now.`}
      heading={`Your plan changed: ${fromTierName} to ${toTierName}`}
    >
      <Text style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: "15px", color: "#4A5568", lineHeight: "1.6", margin: "0 0 18px" }}>
        Hello {first}, your membership changed from {fromTierName} to {toTierName}. Your new hours allowance is {newHoursTotal} (effective immediately, prorated by Stripe). Renews on {renewsAt}.
      </Text>
      <Button
        href="https://butlersinc.com/members/dashboard"
        style={{ backgroundColor: "#B3895D", color: "#FCFBF9", padding: "12px 20px", borderRadius: "4px", fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: "14px", textDecoration: "none" }}
      >
        View dashboard
      </Button>
    </MembershipEmailLayout>
  );
}

PlanChangedEmail.PreviewProps = {
  name: "Ada", fromTierName: "Lite", toTierName: "Pro", newHoursTotal: 55, renewsAt: "25 Jun 2026",
} satisfies PlanChangedEmailProps;

export default PlanChangedEmail;
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npm run test:run -- src/emails/membership/__tests__/PlanChangedEmail.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/emails/membership/PlanChangedEmail.tsx src/emails/membership/__tests__/PlanChangedEmail.test.tsx
git commit -m "feat(emails): add PlanChangedEmail template"
```

---

## Task 13: Shared admin email layout + first admin template (`NewMemberNotification`)

**Files:**
- Create: `src/emails/membership/admin/AdminEmailLayout.tsx`
- Create: `src/emails/membership/admin/NewMemberNotification.tsx`
- Test: `src/emails/membership/__tests__/admin-NewMemberNotification.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/emails/membership/__tests__/admin-NewMemberNotification.test.tsx
import { describe, it, expect } from "vitest";
import { render } from "@react-email/components";
import { NewMemberNotification } from "../admin/NewMemberNotification";

const props = { name: "Ada Lovelace", email: "ada@example.com", tierName: "Lite", monthlyPrice: 500, subscriptionId: "sub_abc123" };

describe("NewMemberNotification (admin)", () => {
  it("shows name, email, tier, price, subscription ID", async () => {
    const html = await render(<NewMemberNotification {...props} />);
    expect(html).toContain("New Lite member: Ada Lovelace");
    expect(html).toContain("ada@example.com");
    expect(html).toContain("£500");
    expect(html).toContain("sub_abc123");
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npm run test:run -- src/emails/membership/__tests__/admin-NewMemberNotification.test.tsx`
Expected: cannot find module.

- [ ] **Step 3: Write the layout + template**

```tsx
// src/emails/membership/admin/AdminEmailLayout.tsx
import { Body, Container, Head, Html, Preview, Section, Text } from "@react-email/components";
import { EmailHeader } from "@/emails/components/EmailHeader";
import { EmailFooter } from "@/emails/components/EmailFooter";

interface Props { preview: string; heading: string; children: React.ReactNode; }

export function AdminEmailLayout({ preview, heading, children }: Props) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: "#FCFBF9", margin: 0, padding: "40px 0" }}>
        <Container style={{ maxWidth: "560px", margin: "0 auto", backgroundColor: "#FCFBF9", borderRadius: "4px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
          <EmailHeader />
          <Section style={{ padding: "32px 40px 24px" }}>
            <Text style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "22px", color: "#262F3D", margin: "0 0 12px", fontWeight: "normal" }}>
              {heading}
            </Text>
            {children}
          </Section>
          <EmailFooter />
        </Container>
      </Body>
    </Html>
  );
}
```

```tsx
// src/emails/membership/admin/NewMemberNotification.tsx
import { Text } from "@react-email/components";
import { AdminEmailLayout } from "./AdminEmailLayout";
import { DetailRow } from "@/emails/components/DetailRow";

export interface NewMemberNotificationProps {
  name: string;
  email: string;
  tierName: string;
  monthlyPrice: number;
  subscriptionId: string;
}

export function NewMemberNotification({ name, email, tierName, monthlyPrice, subscriptionId }: NewMemberNotificationProps) {
  return (
    <AdminEmailLayout
      preview={`New ${tierName} member: ${name}`}
      heading={`New ${tierName} member: ${name}`}
    >
      <DetailRow label="Name" value={name} />
      <DetailRow label="Email" value={email} />
      <DetailRow label="Tier" value={tierName} />
      <DetailRow label="Monthly" value={`£${monthlyPrice}`} />
      <DetailRow label="Subscription" value={subscriptionId} />
      <Text style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: "12px", color: "#9E9893", margin: "16px 0 0" }}>
        Sent automatically by Butlers Inc lifecycle notifier.
      </Text>
    </AdminEmailLayout>
  );
}

NewMemberNotification.PreviewProps = {
  name: "Ada Lovelace", email: "ada@example.com", tierName: "Lite", monthlyPrice: 500, subscriptionId: "sub_abc123",
} satisfies NewMemberNotificationProps;

export default NewMemberNotification;
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npm run test:run -- src/emails/membership/__tests__/admin-NewMemberNotification.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/emails/membership/admin/AdminEmailLayout.tsx src/emails/membership/admin/NewMemberNotification.tsx src/emails/membership/__tests__/admin-NewMemberNotification.test.tsx
git commit -m "feat(emails): add admin shared layout + NewMemberNotification"
```

---

## Task 14: Admin `PaymentFailedNotification`

**Files:**
- Create: `src/emails/membership/admin/PaymentFailedNotification.tsx`
- Test: `src/emails/membership/__tests__/admin-PaymentFailedNotification.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/emails/membership/__tests__/admin-PaymentFailedNotification.test.tsx
import { describe, it, expect } from "vitest";
import { render } from "@react-email/components";
import { PaymentFailedNotification } from "../admin/PaymentFailedNotification";

describe("PaymentFailedNotification (admin)", () => {
  it("shows recovery context", async () => {
    const html = await render(<PaymentFailedNotification name="Ada" email="ada@example.com" tierName="Pro" />);
    expect(html).toContain("Payment failed: Ada (Pro)");
    expect(html).toContain("ada@example.com");
    expect(html).toContain("Stripe will retry");
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npm run test:run -- src/emails/membership/__tests__/admin-PaymentFailedNotification.test.tsx`
Expected: cannot find module.

- [ ] **Step 3: Write the implementation**

```tsx
// src/emails/membership/admin/PaymentFailedNotification.tsx
import { Text } from "@react-email/components";
import { AdminEmailLayout } from "./AdminEmailLayout";
import { DetailRow } from "@/emails/components/DetailRow";

export interface PaymentFailedNotificationProps { name: string; email: string; tierName: string; }

export function PaymentFailedNotification({ name, email, tierName }: PaymentFailedNotificationProps) {
  return (
    <AdminEmailLayout
      preview={`Payment failed: ${name} (${tierName})`}
      heading={`Payment failed: ${name} (${tierName})`}
    >
      <DetailRow label="Name" value={name} />
      <DetailRow label="Email" value={email} />
      <DetailRow label="Tier" value={tierName} />
      <Text style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: "13px", color: "#4A5568", margin: "12px 0 0" }}>
        Stripe will retry automatically. Member benefits are suspended until payment recovers.
      </Text>
    </AdminEmailLayout>
  );
}

PaymentFailedNotification.PreviewProps = { name: "Ada", email: "ada@example.com", tierName: "Pro" } satisfies PaymentFailedNotificationProps;
export default PaymentFailedNotification;
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npm run test:run -- src/emails/membership/__tests__/admin-PaymentFailedNotification.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/emails/membership/admin/PaymentFailedNotification.tsx src/emails/membership/__tests__/admin-PaymentFailedNotification.test.tsx
git commit -m "feat(emails): add admin PaymentFailedNotification"
```

---

## Task 15: Admin `PauseNotification`

**Files:**
- Create: `src/emails/membership/admin/PauseNotification.tsx`
- Test: `src/emails/membership/__tests__/admin-PauseNotification.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/emails/membership/__tests__/admin-PauseNotification.test.tsx
import { describe, it, expect } from "vitest";
import { render } from "@react-email/components";
import { PauseNotification } from "../admin/PauseNotification";

describe("PauseNotification (admin)", () => {
  it("shows pause context with timestamp", async () => {
    const html = await render(<PauseNotification name="Ada" email="ada@example.com" tierName="Lite" pausedAt="25 May 2026" />);
    expect(html).toContain("Membership paused: Ada (Lite)");
    expect(html).toContain("ada@example.com");
    expect(html).toContain("25 May 2026");
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npm run test:run -- src/emails/membership/__tests__/admin-PauseNotification.test.tsx`
Expected: cannot find module.

- [ ] **Step 3: Write the implementation**

```tsx
// src/emails/membership/admin/PauseNotification.tsx
import { AdminEmailLayout } from "./AdminEmailLayout";
import { DetailRow } from "@/emails/components/DetailRow";

export interface PauseNotificationProps { name: string; email: string; tierName: string; pausedAt: string; }

export function PauseNotification({ name, email, tierName, pausedAt }: PauseNotificationProps) {
  return (
    <AdminEmailLayout
      preview={`Membership paused: ${name} (${tierName})`}
      heading={`Membership paused: ${name} (${tierName})`}
    >
      <DetailRow label="Name" value={name} />
      <DetailRow label="Email" value={email} />
      <DetailRow label="Tier" value={tierName} />
      <DetailRow label="Paused" value={pausedAt} />
    </AdminEmailLayout>
  );
}

PauseNotification.PreviewProps = { name: "Ada", email: "ada@example.com", tierName: "Lite", pausedAt: "25 May 2026" } satisfies PauseNotificationProps;
export default PauseNotification;
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npm run test:run -- src/emails/membership/__tests__/admin-PauseNotification.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/emails/membership/admin/PauseNotification.tsx src/emails/membership/__tests__/admin-PauseNotification.test.tsx
git commit -m "feat(emails): add admin PauseNotification"
```

---

## Task 16: Admin `CancelScheduledNotification`

**Files:**
- Create: `src/emails/membership/admin/CancelScheduledNotification.tsx`
- Test: `src/emails/membership/__tests__/admin-CancelScheduledNotification.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/emails/membership/__tests__/admin-CancelScheduledNotification.test.tsx
import { describe, it, expect } from "vitest";
import { render } from "@react-email/components";
import { CancelScheduledNotification } from "../admin/CancelScheduledNotification";

describe("CancelScheduledNotification (admin)", () => {
  it("shows cancellation context", async () => {
    const html = await render(<CancelScheduledNotification name="Ada" email="ada@example.com" tierName="Pro" endsAt="25 Jun 2026" />);
    expect(html).toContain("Cancellation scheduled: Ada (Pro)");
    expect(html).toContain("ada@example.com");
    expect(html).toContain("25 Jun 2026");
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npm run test:run -- src/emails/membership/__tests__/admin-CancelScheduledNotification.test.tsx`
Expected: cannot find module.

- [ ] **Step 3: Write the implementation**

```tsx
// src/emails/membership/admin/CancelScheduledNotification.tsx
import { AdminEmailLayout } from "./AdminEmailLayout";
import { DetailRow } from "@/emails/components/DetailRow";

export interface CancelScheduledNotificationProps { name: string; email: string; tierName: string; endsAt: string; }

export function CancelScheduledNotification({ name, email, tierName, endsAt }: CancelScheduledNotificationProps) {
  return (
    <AdminEmailLayout
      preview={`Cancellation scheduled: ${name} (${tierName})`}
      heading={`Cancellation scheduled: ${name} (${tierName})`}
    >
      <DetailRow label="Name" value={name} />
      <DetailRow label="Email" value={email} />
      <DetailRow label="Tier" value={tierName} />
      <DetailRow label="Ends" value={endsAt} />
    </AdminEmailLayout>
  );
}

CancelScheduledNotification.PreviewProps = {
  name: "Ada", email: "ada@example.com", tierName: "Pro", endsAt: "25 Jun 2026",
} satisfies CancelScheduledNotificationProps;
export default CancelScheduledNotification;
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npm run test:run -- src/emails/membership/__tests__/admin-CancelScheduledNotification.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/emails/membership/admin/CancelScheduledNotification.tsx src/emails/membership/__tests__/admin-CancelScheduledNotification.test.tsx
git commit -m "feat(emails): add admin CancelScheduledNotification"
```

---

## Task 17: Admin `CancellationFinalNotification`

**Files:**
- Create: `src/emails/membership/admin/CancellationFinalNotification.tsx`
- Test: `src/emails/membership/__tests__/admin-CancellationFinalNotification.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/emails/membership/__tests__/admin-CancellationFinalNotification.test.tsx
import { describe, it, expect } from "vitest";
import { render } from "@react-email/components";
import { CancellationFinalNotification } from "../admin/CancellationFinalNotification";

describe("CancellationFinalNotification (admin)", () => {
  it("shows ended context", async () => {
    const html = await render(<CancellationFinalNotification name="Ada" email="ada@example.com" tierName="Lite" endedAt="25 Jun 2026" />);
    expect(html).toContain("Membership ended: Ada (Lite)");
    expect(html).toContain("ada@example.com");
    expect(html).toContain("25 Jun 2026");
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npm run test:run -- src/emails/membership/__tests__/admin-CancellationFinalNotification.test.tsx`
Expected: cannot find module.

- [ ] **Step 3: Write the implementation**

```tsx
// src/emails/membership/admin/CancellationFinalNotification.tsx
import { AdminEmailLayout } from "./AdminEmailLayout";
import { DetailRow } from "@/emails/components/DetailRow";

export interface CancellationFinalNotificationProps { name: string; email: string; tierName: string; endedAt: string; }

export function CancellationFinalNotification({ name, email, tierName, endedAt }: CancellationFinalNotificationProps) {
  return (
    <AdminEmailLayout
      preview={`Membership ended: ${name} (${tierName})`}
      heading={`Membership ended: ${name} (${tierName})`}
    >
      <DetailRow label="Name" value={name} />
      <DetailRow label="Email" value={email} />
      <DetailRow label="Tier" value={tierName} />
      <DetailRow label="Ended" value={endedAt} />
    </AdminEmailLayout>
  );
}

CancellationFinalNotification.PreviewProps = {
  name: "Ada", email: "ada@example.com", tierName: "Lite", endedAt: "25 Jun 2026",
} satisfies CancellationFinalNotificationProps;
export default CancellationFinalNotification;
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npm run test:run -- src/emails/membership/__tests__/admin-CancellationFinalNotification.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/emails/membership/admin/CancellationFinalNotification.tsx src/emails/membership/__tests__/admin-CancellationFinalNotification.test.tsx
git commit -m "feat(emails): add admin CancellationFinalNotification"
```

---

## Task 18: `lifecycle-notifier.ts` — orchestrator with Resend wiring (TDD with mocks)

**Files:**
- Create: `src/lib/membership/lifecycle-notifier.ts`
- Test: `src/lib/membership/__tests__/lifecycle-notifier.test.ts`

This is the central piece. The notifier owns: idempotency-log INSERT, recipient resolution (member from passed-in arg, admin via `resolveAdminRecipient`), template render + Resend send per recipient, success → UPDATE `resend_id`, transient failure → DELETE log row, permanent failure → keep log row + emit `console.error("lifecycle.email.permanent_failure", ...)`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/membership/__tests__/lifecycle-notifier.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendMock = vi.fn();
const insertMock = vi.fn();
const updateMock = vi.fn();
const deleteMock = vi.fn();

vi.mock("resend", () => ({ Resend: vi.fn().mockImplementation(() => ({ emails: { send: sendMock } })) }));

function makeDb() {
  insertMock.mockReturnValue({ select: () => ({ maybeSingle: () => Promise.resolve({ data: { event_id: "evt_1" } }) }) });
  updateMock.mockReturnValue({ eq: () => ({ eq: () => ({ eq: () => Promise.resolve({ data: null }) }) }) });
  deleteMock.mockReturnValue({ eq: () => ({ eq: () => ({ eq: () => Promise.resolve({ data: null }) }) }) });
  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table !== "lifecycle_email_log") throw new Error("unexpected table " + table);
      return {
        insert: (rows: unknown) => { insertMock(rows); return { select: () => ({ maybeSingle: () => Promise.resolve({ data: { event_id: "evt_1" } }) }) }; },
        update: (patch: unknown) => { updateMock(patch); return { eq: () => ({ eq: () => ({ eq: () => Promise.resolve({ data: null }) }) }) }; },
        delete: () => { deleteMock(); return { eq: () => ({ eq: () => ({ eq: () => Promise.resolve({ data: null }) }) }) }; },
      };
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.RESEND_API_KEY = "re_test";
  process.env.MEMBERSHIP_ADMIN_NOTIFY_EMAIL = "admin@example.com";
});

afterEach(() => {
  delete process.env.RESEND_API_KEY;
  delete process.env.MEMBERSHIP_ADMIN_NOTIFY_EMAIL;
});

import { notifyLifecycle } from "../lifecycle-notifier";

describe("notifyLifecycle", () => {
  it("sends the member welcome email and the admin new-member email for activated", async () => {
    sendMock.mockResolvedValue({ data: { id: "re_id_1" }, error: null });
    await notifyLifecycle({
      eventId: "evt_1",
      transition: { kind: "activated", tierSlug: "lite", hoursTotal: 10, tasksTotal: 5, renewsAt: "25 Jun 2026" },
      recipient: { email: "ada@example.com", name: "Ada" },
      subscriptionId: "sub_abc",
    }, makeDb() as never);

    expect(sendMock).toHaveBeenCalledTimes(2);
    const memberCall = sendMock.mock.calls.find(([c]) => c.to === "ada@example.com");
    const adminCall = sendMock.mock.calls.find(([c]) => c.to === "admin@example.com");
    expect(memberCall?.[0].subject).toBe("Welcome to Butlers Inc Lite");
    expect(adminCall?.[0].subject).toBe("New Lite member: Ada");
  });

  it("skips Resend when the lifecycle_email_log insert returns no row (duplicate)", async () => {
    const db = {
      from: vi.fn().mockReturnValue({
        insert: () => ({ select: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }),
      }),
    };
    await notifyLifecycle({
      eventId: "evt_dup",
      transition: { kind: "paused", tierSlug: "lite" },
      recipient: { email: "ada@example.com", name: "Ada" },
      subscriptionId: "sub_abc",
    }, db as never);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("on Resend 5xx, deletes the log row so Stripe retry can re-attempt", async () => {
    sendMock.mockResolvedValue({ data: null, error: { name: "API_ERROR", message: "Internal", statusCode: 500 } });
    await notifyLifecycle({
      eventId: "evt_2",
      transition: { kind: "paused", tierSlug: "lite" },
      recipient: { email: "ada@example.com", name: "Ada" },
      subscriptionId: "sub_abc",
    }, makeDb() as never);
    expect(deleteMock).toHaveBeenCalled();
  });

  it("on Resend 4xx, keeps the log row to prevent a retry storm", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    sendMock.mockResolvedValue({ data: null, error: { name: "validation_error", message: "Invalid to", statusCode: 422 } });
    await notifyLifecycle({
      eventId: "evt_3",
      transition: { kind: "paused", tierSlug: "lite" },
      recipient: { email: "ada@example.com", name: "Ada" },
      subscriptionId: "sub_abc",
    }, makeDb() as never);
    expect(deleteMock).not.toHaveBeenCalled();
    expect(errSpy).toHaveBeenCalledWith("lifecycle.email.permanent_failure", expect.any(Object));
    errSpy.mockRestore();
  });

  it("does not throw when transition is noop", async () => {
    await notifyLifecycle({
      eventId: "evt_4",
      transition: { kind: "noop" },
      recipient: { email: "ada@example.com", name: "Ada" },
      subscriptionId: "sub_abc",
    }, makeDb() as never);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("sends only member email when admin recipient is not resolved", async () => {
    delete process.env.MEMBERSHIP_ADMIN_NOTIFY_EMAIL;
    delete process.env.BOOKING_ADMIN_NOTIFY_EMAIL;
    delete process.env.ADMIN_EMAILS;
    sendMock.mockResolvedValue({ data: { id: "x" }, error: null });
    await notifyLifecycle({
      eventId: "evt_5",
      transition: { kind: "activated", tierSlug: "lite", hoursTotal: 10, tasksTotal: 5, renewsAt: "25 Jun 2026" },
      recipient: { email: "ada@example.com", name: "Ada" },
      subscriptionId: "sub_abc",
    }, makeDb() as never);
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock.mock.calls[0][0].to).toBe("ada@example.com");
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npm run test:run -- src/lib/membership/__tests__/lifecycle-notifier.test.ts`
Expected: cannot find module `../lifecycle-notifier`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/membership/lifecycle-notifier.ts
import { Resend } from "resend";
import { render } from "@react-email/components";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Transition } from "./lifecycle-transitions";
import { resolveAdminRecipient } from "./admin-recipient";
import { MEMBERSHIP_TIERS } from "@/data/membership-config";

import { WelcomeEmail } from "@/emails/membership/WelcomeEmail";
import { RenewalReceiptEmail } from "@/emails/membership/RenewalReceiptEmail";
import { PaymentFailedEmail } from "@/emails/membership/PaymentFailedEmail";
import { PauseConfirmedEmail } from "@/emails/membership/PauseConfirmedEmail";
import { ResumeConfirmedEmail } from "@/emails/membership/ResumeConfirmedEmail";
import { CancellationScheduledEmail } from "@/emails/membership/CancellationScheduledEmail";
import { CancellationFinalEmail } from "@/emails/membership/CancellationFinalEmail";
import { PlanChangedEmail } from "@/emails/membership/PlanChangedEmail";

import { NewMemberNotification } from "@/emails/membership/admin/NewMemberNotification";
import { PaymentFailedNotification } from "@/emails/membership/admin/PaymentFailedNotification";
import { PauseNotification } from "@/emails/membership/admin/PauseNotification";
import { CancelScheduledNotification } from "@/emails/membership/admin/CancelScheduledNotification";
import { CancellationFinalNotification } from "@/emails/membership/admin/CancellationFinalNotification";

const FROM = "Butlers Inc <memberships@butlersinc.com>";
const REPLY_TO = "hello@butlersinc.com";

export interface NotifyArgs {
  eventId: string;
  transition: Transition;
  recipient: { email: string; name: string };
  subscriptionId: string;
}

interface RenderedEmail { subject: string; html: string; text: string; }
type RenderFn = () => Promise<RenderedEmail>;

function tierName(slug: string): string {
  return MEMBERSHIP_TIERS.find((t) => t.slug === slug)?.name ?? slug;
}

function tierPrice(slug: string): number {
  return MEMBERSHIP_TIERS.find((t) => t.slug === slug)?.monthlyPrice ?? 0;
}

function formatUk(iso: string): string {
  if (!iso) return iso;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

async function renderEmail(subject: string, node: React.ReactElement): Promise<RenderedEmail> {
  const [html, text] = await Promise.all([
    render(node),
    render(node, { plainText: true }),
  ]);
  return { subject, html, text };
}

function memberRenderer(t: Transition, name: string): RenderFn | null {
  switch (t.kind) {
    case "activated":
      return () => renderEmail(`Welcome to Butlers Inc ${tierName(t.tierSlug)}`,
        WelcomeEmail({ name, tierName: tierName(t.tierSlug), hoursTotal: t.hoursTotal, tasksTotal: t.tasksTotal, renewsAt: formatUk(t.renewsAt) }));
    case "renewed":
      return () => renderEmail(`Your Butlers Inc ${tierName(t.tierSlug)} has renewed`,
        RenewalReceiptEmail({
          name, tierName: tierName(t.tierSlug), monthlyPrice: t.monthlyPrice,
          hoursTotal: MEMBERSHIP_TIERS.find((m) => m.slug === t.tierSlug)?.personalHoursIncluded ?? 0,
          tasksTotal: MEMBERSHIP_TIERS.find((m) => m.slug === t.tierSlug)?.virtualTasksIncluded ?? 0,
          periodEnd: formatUk(t.periodEnd),
        }));
    case "payment_failed":
      return () => renderEmail(`Action needed: payment failed for your Butlers Inc ${tierName(t.tierSlug)}`,
        PaymentFailedEmail({ name, tierName: tierName(t.tierSlug) }));
    case "paused":
      return () => renderEmail(`Your Butlers Inc ${tierName(t.tierSlug)} is paused`,
        PauseConfirmedEmail({ name, tierName: tierName(t.tierSlug) }));
    case "resumed":
      return () => renderEmail(`Welcome back to your Butlers Inc ${tierName(t.tierSlug)}`,
        ResumeConfirmedEmail({ name, tierName: tierName(t.tierSlug) }));
    case "cancel_scheduled":
      return () => renderEmail(`Your Butlers Inc ${tierName(t.tierSlug)} cancels on ${formatUk(t.endsAt)}`,
        CancellationScheduledEmail({ name, tierName: tierName(t.tierSlug), endsAt: formatUk(t.endsAt) }));
    case "cancel_reversed":
      // No member email per spec (PlanManager toast / banner clear handles it).
      return null;
    case "cancelled":
      return () => renderEmail(`Your Butlers Inc ${tierName(t.tierSlug)} has ended`,
        CancellationFinalEmail({ name, tierName: tierName(t.tierSlug), endedAt: formatUk(new Date().toISOString()) }));
    case "plan_changed":
      return () => renderEmail(`Your plan changed: ${tierName(t.fromTierSlug)} to ${tierName(t.toTierSlug)}`,
        PlanChangedEmail({
          name,
          fromTierName: tierName(t.fromTierSlug),
          toTierName: tierName(t.toTierSlug),
          newHoursTotal: t.newHoursTotal,
          renewsAt: formatUk(t.renewsAt),
        }));
    case "noop":
      return null;
  }
}

function adminRenderer(t: Transition, member: { email: string; name: string }, subscriptionId: string): RenderFn | null {
  switch (t.kind) {
    case "activated":
      return () => renderEmail(`New ${tierName(t.tierSlug)} member: ${member.name}`,
        NewMemberNotification({ name: member.name, email: member.email, tierName: tierName(t.tierSlug), monthlyPrice: tierPrice(t.tierSlug), subscriptionId }));
    case "payment_failed":
      return () => renderEmail(`Payment failed: ${member.name} (${tierName(t.tierSlug)})`,
        PaymentFailedNotification({ name: member.name, email: member.email, tierName: tierName(t.tierSlug) }));
    case "paused":
      return () => renderEmail(`Membership paused: ${member.name} (${tierName(t.tierSlug)})`,
        PauseNotification({ name: member.name, email: member.email, tierName: tierName(t.tierSlug), pausedAt: formatUk(new Date().toISOString()) }));
    case "cancel_scheduled":
      return () => renderEmail(`Cancellation scheduled: ${member.name} (${tierName(t.tierSlug)})`,
        CancelScheduledNotification({ name: member.name, email: member.email, tierName: tierName(t.tierSlug), endsAt: formatUk(t.endsAt) }));
    case "cancelled":
      return () => renderEmail(`Membership ended: ${member.name} (${tierName(t.tierSlug)})`,
        CancellationFinalNotification({ name: member.name, email: member.email, tierName: tierName(t.tierSlug), endedAt: formatUk(new Date().toISOString()) }));
    default:
      return null;
  }
}

function isPermanentResendError(error: { statusCode?: number } | null | undefined): boolean {
  if (!error?.statusCode) return false;
  return error.statusCode >= 400 && error.statusCode < 500;
}

async function sendOne(args: {
  db: SupabaseClient;
  resend: Resend;
  eventId: string;
  transitionKind: string;
  recipientKind: "member" | "admin";
  to: string;
  rendered: RenderedEmail;
}) {
  const { db, resend, eventId, transitionKind, recipientKind, to, rendered } = args;
  const insertRes = await db
    .from("lifecycle_email_log")
    .insert({ event_id: eventId, transition: transitionKind, recipient: recipientKind })
    .select()
    .maybeSingle();
  // On conflict the row is not returned; treat as already-sent and skip.
  if (!insertRes.data) return;
  const send = await resend.emails.send({
    from: FROM,
    to,
    replyTo: REPLY_TO,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  });
  if (send.error) {
    if (isPermanentResendError(send.error as { statusCode?: number })) {
      console.error("lifecycle.email.permanent_failure", { eventId, transitionKind, recipientKind, to, error: send.error });
      // Keep the log row so we don't retry-storm.
      return;
    }
    // Transient — delete log row so the next Stripe retry can re-attempt.
    console.error("lifecycle.email.transient_failure", { eventId, transitionKind, recipientKind, to, error: send.error });
    await db.from("lifecycle_email_log").delete()
      .eq("event_id", eventId).eq("transition", transitionKind).eq("recipient", recipientKind);
    return;
  }
  if (send.data?.id) {
    await db.from("lifecycle_email_log").update({ resend_id: send.data.id })
      .eq("event_id", eventId).eq("transition", transitionKind).eq("recipient", recipientKind);
  }
}

export async function notifyLifecycle(args: NotifyArgs, db: SupabaseClient): Promise<void> {
  if (args.transition.kind === "noop") return;
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey || resendKey === "your-resend-api-key") {
    console.warn("lifecycle.notify.skipped no RESEND_API_KEY", { eventId: args.eventId, transition: args.transition.kind });
    return;
  }
  const resend = new Resend(resendKey);

  const member = memberRenderer(args.transition, args.recipient.name);
  if (member) {
    const rendered = await member();
    await sendOne({ db, resend, eventId: args.eventId, transitionKind: args.transition.kind, recipientKind: "member", to: args.recipient.email, rendered });
  }

  const admin = adminRenderer(args.transition, args.recipient, args.subscriptionId);
  const adminTo = resolveAdminRecipient();
  if (admin && adminTo) {
    const rendered = await admin();
    await sendOne({ db, resend, eventId: args.eventId, transitionKind: args.transition.kind, recipientKind: "admin", to: adminTo, rendered });
  }
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npm run test:run -- src/lib/membership/__tests__/lifecycle-notifier.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/membership/lifecycle-notifier.ts src/lib/membership/__tests__/lifecycle-notifier.test.ts
git commit -m "feat(membership): add lifecycle notifier orchestrator with idempotency + Resend"
```

---

## Task 19: Wire `notifyLifecycle` into `webhook-handler.ts`

**Files:**
- Modify: `src/lib/payment/webhook-handler.ts`

Each existing handler reads the prior row (already done for the stale-event guard), performs its UPDATE/INSERT, then calls `notifyLifecycle(...)` wrapped in try/catch. Recipient name + email are read from `auth.users` via the service-role client using the `user_id` on the row.

- [ ] **Step 1: Modify `webhook-handler.ts` to add notify after each handler**

```ts
// src/lib/payment/webhook-handler.ts (full file replacement)
import type { SupabaseClient } from "@supabase/supabase-js";
import type { WebhookEvent, CheckoutSessionData, SubscriptionData } from "./types";
import { detectTransition, type MembershipRow } from "@/lib/membership/lifecycle-transitions";
import { notifyLifecycle } from "@/lib/membership/lifecycle-notifier";

type DB = SupabaseClient;

function priceIdToSlug(priceId: string): string {
  return priceId.replace(/^mock_/, "").replace(/^price_/, "");
}

async function lookupTierByPriceId(db: DB, priceId: string) {
  const slug = priceIdToSlug(priceId);
  const { data } = await db.from("membership_tiers").select().eq("slug", slug).maybeSingle();
  return data as { id: string; slug: string; personal_hours_included: number; virtual_tasks_included: number } | null;
}

async function tierSlugLookup(db: DB, tierId: string | null): Promise<"lite" | "frequent" | "pro"> {
  if (!tierId) return "lite";
  const { data } = await db.from("membership_tiers").select("slug").eq("id", tierId).maybeSingle();
  return (data?.slug as "lite" | "frequent" | "pro") ?? "lite";
}

async function readRecipient(db: DB, userId: string): Promise<{ email: string; name: string } | null> {
  // Service-role admin client only.
  const adminAuth = (db as unknown as { auth: { admin: { getUserById: (id: string) => Promise<{ data: { user: { email?: string; user_metadata?: { name?: string } } | null } }> } } }).auth.admin;
  const { data } = await adminAuth.getUserById(userId);
  const user = data?.user;
  if (!user?.email) return null;
  return { email: user.email, name: (user.user_metadata?.name as string) ?? user.email };
}

function periodFromEvent(d: CheckoutSessionData) {
  return {
    billing_period_start: new Date(d.current_period_start * 1000).toISOString(),
    billing_period_end: new Date(d.current_period_end * 1000).toISOString(),
  };
}

function asMembershipRow(row: Record<string, unknown>): MembershipRow {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    status: row.status as string,
    tier_id: (row.tier_id as string | null) ?? null,
    cancel_at_period_end: Boolean(row.cancel_at_period_end),
    billing_period_end: row.billing_period_end as string,
    stripe_subscription_id: (row.stripe_subscription_id as string | null) ?? null,
    updated_at: row.updated_at as string,
    personal_hours_total: (row.personal_hours_total as number) ?? 0,
    virtual_tasks_total: (row.virtual_tasks_total as number) ?? 0,
  };
}

async function safelyNotify(args: Parameters<typeof notifyLifecycle>[0], db: DB) {
  try {
    await notifyLifecycle(args, db);
  } catch (err) {
    console.error("lifecycle.notify.failed", err);
  }
}

export async function handleCheckoutCompleted(event: Extract<WebhookEvent, { type: "checkout.session.completed" }>, db: DB) {
  const d = event.data;
  if (!d.client_reference_id) return;
  if (!d.subscription) return;
  const priceId = d.line_items?.[0]?.price.id ?? "";
  const tier = await lookupTierByPriceId(db, priceId);
  if (!tier) {
    console.error(`webhook handleCheckoutCompleted: no tier matched priceId=${priceId} (subscription=${d.subscription}, user=${d.client_reference_id}) — membership NOT provisioned`);
    return;
  }
  const period = periodFromEvent(d);

  const { data: existingBySub } = await db.from("memberships").select().eq("stripe_subscription_id", d.subscription).maybeSingle();
  if (existingBySub) return;

  const { data: existingByUser } = await db.from("memberships").select().eq("user_id", d.client_reference_id).eq("status", "active").maybeSingle();
  const priorRow = existingByUser ? asMembershipRow(existingByUser as Record<string, unknown>) : null;

  const patch = {
    tier_id: tier.id,
    stripe_customer_id: d.customer,
    stripe_subscription_id: d.subscription,
    status: "active" as const,
    personal_hours_total: tier.personal_hours_included,
    personal_hours_used: 0,
    virtual_tasks_total: tier.virtual_tasks_included,
    virtual_tasks_used: 0,
    cancel_at_period_end: false,
    paused_at: null,
    updated_at: new Date().toISOString(),
    ...period,
  };

  let updatedRow: Record<string, unknown> | null = null;
  if (existingByUser) {
    const { data } = await db.from("memberships").update(patch).eq("id", existingByUser.id).select().maybeSingle();
    updatedRow = data;
  } else {
    const { data } = await db.from("memberships").insert({ user_id: d.client_reference_id, ...patch }).select().maybeSingle();
    updatedRow = data;
  }
  if (!updatedRow) return;

  const recipient = await readRecipient(db, d.client_reference_id);
  if (!recipient) return;
  const transition = detectTransition({
    event, priorRow, updatedRow: asMembershipRow(updatedRow),
    tierSlugLookup: () => tier.slug as "lite" | "frequent" | "pro",
  });
  await safelyNotify({ eventId: `evt_checkout_${d.id}`, transition, recipient, subscriptionId: d.subscription }, db);
}

function statusFromStripe(s: SubscriptionData["status"]): "active" | "paused" | "cancelled" | "past_due" {
  if (s === "canceled" || s === "unpaid" || s === "incomplete_expired") return "cancelled";
  if (s === "paused") return "paused";
  if (s === "past_due" || s === "incomplete") return "past_due";
  return "active";
}

async function findRowBySub(db: DB, subscriptionId: string) {
  const { data } = await db.from("memberships").select().eq("stripe_subscription_id", subscriptionId).maybeSingle();
  return data as Record<string, unknown> | null;
}

export async function handleSubscriptionUpdated(event: Extract<WebhookEvent, { type: "customer.subscription.updated" }>, db: DB) {
  const d = event.data;
  const row = await findRowBySub(db, d.id);
  if (!row) return;
  if (new Date(row.updated_at as string).getTime() / 1000 > event.created) return;

  const newPriceId = d.items.data[0]?.price.id;
  const newTier = newPriceId ? await lookupTierByPriceId(db, newPriceId) : null;
  const newStatus = statusFromStripe(d.status);
  const priorRow = asMembershipRow(row);

  const patch: Record<string, unknown> = {
    status: newStatus,
    cancel_at_period_end: d.cancel_at_period_end,
    billing_period_start: new Date(d.current_period_start * 1000).toISOString(),
    billing_period_end: new Date(d.current_period_end * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (newStatus === "paused" && row.status !== "paused") {
    patch.paused_at = new Date().toISOString();
  } else if (newStatus !== "paused" && row.status === "paused") {
    patch.paused_at = null;
  }

  if (newTier && newTier.id !== row.tier_id) {
    patch.tier_id = newTier.id;
    patch.personal_hours_total = newTier.personal_hours_included;
    patch.virtual_tasks_total = newTier.virtual_tasks_included;
    if ((row.personal_hours_used as number) > newTier.personal_hours_included) patch.personal_hours_used = newTier.personal_hours_included;
    if ((row.virtual_tasks_used as number) > newTier.virtual_tasks_included) patch.virtual_tasks_used = newTier.virtual_tasks_included;
  }
  const { data: updated } = await db.from("memberships").update(patch).eq("id", row.id as string).select().maybeSingle();
  if (!updated) return;

  const recipient = await readRecipient(db, row.user_id as string);
  if (!recipient) return;
  // Resolve OLD slug from priorRow.tier_id (separate DB lookup); NEW slug
  // comes from the freshly-resolved tier (newTier?.slug) or falls back to
  // the old slug if the update did not include a tier change.
  const oldSlug = await tierSlugLookup(db, priorRow.tier_id);
  const newSlug = (newTier?.slug as "lite" | "frequent" | "pro" | undefined) ?? oldSlug;
  const transition = detectTransition({
    event, priorRow, updatedRow: asMembershipRow(updated),
    tierSlugLookup: (id) => id === priorRow.tier_id ? oldSlug : newSlug,
  });
  await safelyNotify({ eventId: `evt_subupd_${d.id}_${event.created}`, transition, recipient, subscriptionId: d.id }, db);
}

export async function handleSubscriptionDeleted(event: Extract<WebhookEvent, { type: "customer.subscription.deleted" }>, db: DB) {
  const row = await findRowBySub(db, event.data.id);
  if (!row) return;
  const priorRow = asMembershipRow(row);
  const { data: updated } = await db.from("memberships").update({
    status: "cancelled", paused_at: null, updated_at: new Date().toISOString(),
  }).eq("id", row.id as string).select().maybeSingle();
  if (!updated) return;

  const slug = await tierSlugLookup(db, priorRow.tier_id);
  const recipient = await readRecipient(db, row.user_id as string);
  if (!recipient) return;
  const transition = detectTransition({
    event, priorRow, updatedRow: asMembershipRow(updated), tierSlugLookup: () => slug,
  });
  await safelyNotify({ eventId: `evt_subdel_${event.data.id}_${event.created}`, transition, recipient, subscriptionId: event.data.id }, db);
}

export async function handleInvoicePaid(event: Extract<WebhookEvent, { type: "invoice.paid" }>, db: DB) {
  const d = event.data;
  if (!d.subscription) return;
  const row = await findRowBySub(db, d.subscription);
  if (!row) return;
  if (new Date(row.updated_at as string).getTime() / 1000 > event.created) return;
  const priorRow = asMembershipRow(row);

  const patch: Record<string, unknown> = {
    billing_period_start: new Date(d.period_start * 1000).toISOString(),
    billing_period_end: new Date(d.period_end * 1000).toISOString(),
    personal_hours_used: 0,
    virtual_tasks_used: 0,
    updated_at: new Date().toISOString(),
  };
  if (row.status !== "paused") patch.status = "active";
  const { data: updated } = await db.from("memberships").update(patch).eq("id", row.id as string).select().maybeSingle();
  if (!updated) return;

  const slug = await tierSlugLookup(db, priorRow.tier_id);
  const recipient = await readRecipient(db, row.user_id as string);
  if (!recipient) return;
  const transition = detectTransition({
    event, priorRow, updatedRow: asMembershipRow(updated), tierSlugLookup: () => slug,
  });
  await safelyNotify({ eventId: `evt_invpaid_${d.id}`, transition, recipient, subscriptionId: d.subscription }, db);
}

export async function handleInvoicePaymentFailed(event: Extract<WebhookEvent, { type: "invoice.payment_failed" }>, db: DB) {
  const d = event.data;
  if (!d.subscription) return;
  const row = await findRowBySub(db, d.subscription);
  if (!row) return;
  if (new Date(row.updated_at as string).getTime() / 1000 > event.created) return;
  const priorRow = asMembershipRow(row);
  const { data: updated } = await db.from("memberships").update({ status: "past_due", updated_at: new Date().toISOString() }).eq("id", row.id as string).select().maybeSingle();
  if (!updated) return;

  const slug = await tierSlugLookup(db, priorRow.tier_id);
  const recipient = await readRecipient(db, row.user_id as string);
  if (!recipient) return;
  const transition = detectTransition({
    event, priorRow, updatedRow: asMembershipRow(updated), tierSlugLookup: () => slug,
  });
  await safelyNotify({ eventId: `evt_invfail_${d.id}`, transition, recipient, subscriptionId: d.subscription }, db);
}
```

- [ ] **Step 2: Run all existing webhook tests, verify nothing broke**

Run: `npm run test:run -- src/lib/payment/__tests__/webhook-handler`
Expected: existing webhook-handler tests still PASS (DB mutation behaviour preserved; notifier additions are guarded by RESEND_API_KEY which is absent in tests).

- [ ] **Step 3: Run the full test suite**

Run: `npm run test:run`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/payment/webhook-handler.ts
git commit -m "feat(webhook): invoke lifecycle notifier after each membership DB write"
```

---

## Task 20: Extend Stripe webhook route tests to assert notifier wiring

**Files:**
- Modify: `src/app/api/webhooks/stripe/__tests__/route.test.ts`

Add a single test that confirms the route still dispatches to handlers (no regression). The notifier itself is tested in Task 18 and via handler tests.

- [ ] **Step 1: Add a regression test**

```ts
// Append to src/app/api/webhooks/stripe/__tests__/route.test.ts
it("dispatches subscription.updated events to the updated handler", async () => {
  process.env.PAYMENT_GATEWAY = "mock";
  mockParse.mockResolvedValue({ type: "customer.subscription.updated", created: 1, data: { id: "sub_x" } });
  const res = await POST(mockSigned('{"type":"customer.subscription.updated"}'));
  expect(res.status).toBe(200);
  expect(mockHandlers.handleSubscriptionUpdated).toHaveBeenCalled();
});

it("dispatches invoice.paid events to the invoice paid handler", async () => {
  process.env.PAYMENT_GATEWAY = "mock";
  mockParse.mockResolvedValue({ type: "invoice.paid", created: 1, data: { id: "in_x", subscription: "sub_x" } });
  const res = await POST(mockSigned('{"type":"invoice.paid"}'));
  expect(res.status).toBe(200);
  expect(mockHandlers.handleInvoicePaid).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run the tests**

Run: `npm run test:run -- src/app/api/webhooks/stripe/__tests__/route.test.ts`
Expected: all PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/webhooks/stripe/__tests__/route.test.ts
git commit -m "test(webhook): extend stripe route tests for updated + invoice paid dispatch"
```

---

## Task 21: `portal-snapshot.ts` helper (TDD)

**Files:**
- Create: `src/lib/membership/portal-snapshot.ts`
- Test: `src/lib/membership/__tests__/portal-snapshot.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/membership/__tests__/portal-snapshot.test.ts
import { beforeEach, describe, expect, it } from "vitest";
import { stashPortalSnapshot, consumePortalSnapshot, diffSnapshot, type Snapshot } from "../portal-snapshot";

beforeEach(() => sessionStorage.clear());

describe("portal-snapshot", () => {
  it("round-trips and clears on consume", () => {
    const snap: Snapshot = { status: "active", tierSlug: "lite", cancelAtPeriodEnd: false };
    stashPortalSnapshot(snap);
    expect(consumePortalSnapshot()).toEqual(snap);
    expect(consumePortalSnapshot()).toBeNull();
  });
  it("returns null when nothing stashed", () => {
    expect(consumePortalSnapshot()).toBeNull();
  });
  it("returns null for malformed sessionStorage payload", () => {
    sessionStorage.setItem("butlers.portal.snapshot.v1", "not-json");
    expect(consumePortalSnapshot()).toBeNull();
  });
  it("diff: cancelled wins over other flips", () => {
    expect(diffSnapshot({ status: "active", tierSlug: "lite", cancelAtPeriodEnd: false }, { status: "cancelled", tierSlug: "lite", cancelAtPeriodEnd: false })).toEqual({ kind: "cancelled" });
  });
  it("diff: cancel_scheduled", () => {
    expect(diffSnapshot({ status: "active", tierSlug: "lite", cancelAtPeriodEnd: false }, { status: "active", tierSlug: "lite", cancelAtPeriodEnd: true })).toEqual({ kind: "cancel_scheduled" });
  });
  it("diff: cancel_reversed", () => {
    expect(diffSnapshot({ status: "active", tierSlug: "lite", cancelAtPeriodEnd: true }, { status: "active", tierSlug: "lite", cancelAtPeriodEnd: false })).toEqual({ kind: "cancel_reversed" });
  });
  it("diff: plan_changed", () => {
    expect(diffSnapshot({ status: "active", tierSlug: "lite", cancelAtPeriodEnd: false }, { status: "active", tierSlug: "pro", cancelAtPeriodEnd: false })).toEqual({ kind: "plan_changed", toTier: "pro" });
  });
  it("diff: no_change", () => {
    expect(diffSnapshot({ status: "active", tierSlug: "lite", cancelAtPeriodEnd: false }, { status: "active", tierSlug: "lite", cancelAtPeriodEnd: false })).toEqual({ kind: "no_change" });
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npm run test:run -- src/lib/membership/__tests__/portal-snapshot.test.ts`
Expected: cannot find module.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/membership/portal-snapshot.ts
const KEY = "butlers.portal.snapshot.v1";

export interface Snapshot {
  status: string;
  tierSlug: string;
  cancelAtPeriodEnd: boolean;
}

export type SnapshotDiff =
  | { kind: "plan_changed"; toTier: string }
  | { kind: "cancel_scheduled" }
  | { kind: "cancel_reversed" }
  | { kind: "cancelled" }
  | { kind: "no_change" };

export function stashPortalSnapshot(snap: Snapshot): void {
  try { sessionStorage.setItem(KEY, JSON.stringify(snap)); } catch { /* sessionStorage unavailable */ }
}

export function consumePortalSnapshot(): Snapshot | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    const parsed = JSON.parse(raw) as Snapshot;
    if (typeof parsed?.status !== "string" || typeof parsed?.tierSlug !== "string" || typeof parsed?.cancelAtPeriodEnd !== "boolean") return null;
    return parsed;
  } catch { return null; }
}

export function diffSnapshot(prev: Snapshot, curr: Snapshot): SnapshotDiff {
  if (prev.status === "active" && curr.status === "cancelled") return { kind: "cancelled" };
  if (!prev.cancelAtPeriodEnd && curr.cancelAtPeriodEnd) return { kind: "cancel_scheduled" };
  if (prev.cancelAtPeriodEnd && !curr.cancelAtPeriodEnd) return { kind: "cancel_reversed" };
  if (prev.tierSlug !== curr.tierSlug) return { kind: "plan_changed", toTier: curr.tierSlug };
  return { kind: "no_change" };
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npm run test:run -- src/lib/membership/__tests__/portal-snapshot.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/membership/portal-snapshot.ts src/lib/membership/__tests__/portal-snapshot.test.ts
git commit -m "feat(membership): add portal-snapshot helper for return-from-portal diffing"
```

---

## Task 22: `<WelcomeBanner />` component (TDD)

**Files:**
- Create: `src/components/members/WelcomeBanner.tsx`
- Test: `src/components/members/__tests__/WelcomeBanner.test.tsx`

The banner is `"use client"`, reads `?welcome=1` via `useSearchParams`, and is gated by `localStorage` flag `butlers.welcome.dismissed.v1`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/members/__tests__/WelcomeBanner.test.tsx
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { WelcomeBanner } from "../WelcomeBanner";

const searchParamsMock = vi.fn();
vi.mock("next/navigation", () => ({ useSearchParams: () => searchParamsMock() }));

const useMembershipMock = vi.fn();
vi.mock("@/hooks/useMembership", () => ({ useMembership: () => useMembershipMock() }));

beforeEach(() => {
  localStorage.clear();
  useMembershipMock.mockReturnValue({ membership: { tier: { name: "Lite", personalHoursIncluded: 10 } } });
});
afterEach(() => vi.clearAllMocks());

describe("WelcomeBanner", () => {
  it("renders when ?welcome=1 and localStorage flag unset", () => {
    searchParamsMock.mockReturnValue(new URLSearchParams("welcome=1"));
    render(<WelcomeBanner />);
    expect(screen.getByText(/Welcome to Lite/i)).toBeInTheDocument();
  });
  it("hides when ?welcome flag absent", () => {
    searchParamsMock.mockReturnValue(new URLSearchParams(""));
    const { container } = render(<WelcomeBanner />);
    expect(container).toBeEmptyDOMElement();
  });
  it("hides after dismiss and writes localStorage flag", () => {
    searchParamsMock.mockReturnValue(new URLSearchParams("welcome=1"));
    const { container } = render(<WelcomeBanner />);
    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(container).toBeEmptyDOMElement();
    expect(localStorage.getItem("butlers.welcome.dismissed.v1")).toBe("1");
  });
  it("hides when localStorage flag already set, even with ?welcome=1", () => {
    localStorage.setItem("butlers.welcome.dismissed.v1", "1");
    searchParamsMock.mockReturnValue(new URLSearchParams("welcome=1"));
    const { container } = render(<WelcomeBanner />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npm run test:run -- src/components/members/__tests__/WelcomeBanner.test.tsx`
Expected: cannot find module.

- [ ] **Step 3: Write the implementation**

```tsx
// src/components/members/WelcomeBanner.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useMembership } from "@/hooks/useMembership";

const KEY = "butlers.welcome.dismissed.v1";

export function WelcomeBanner() {
  const sp = useSearchParams();
  const { membership } = useMembership();
  const [dismissed, setDismissed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    setDismissed(localStorage.getItem(KEY) === "1");
  }, []);

  if (!hydrated) return null;
  if (sp?.get("welcome") !== "1") return null;
  if (dismissed) return null;

  const tierName = membership?.tier?.name ?? "Butlers Inc";
  const hours = membership?.tier?.personalHoursIncluded ?? 0;

  function dismiss() {
    localStorage.setItem(KEY, "1");
    setDismissed(true);
  }

  return (
    <div className="max-w-4xl mx-auto px-6 mt-6">
      <div className="border border-brass/50 bg-brass/5 rounded-sm p-6 relative">
        <button
          type="button"
          aria-label="Dismiss welcome"
          onClick={dismiss}
          className="absolute top-3 right-3 text-warm-gray hover:text-optical-white"
        >
          ✕
        </button>
        <h2 className="text-xl font-serif text-optical-white mb-2">Welcome to {tierName}</h2>
        <p className="text-warm-gray text-sm mb-4">
          Your {hours} hours are ready. Here&rsquo;s what to try first:
        </p>
        <ul className="space-y-2 text-sm">
          <li><Link href="/members/personal-butler" className="text-brass-text hover:underline">Book a Personal Butler &rarr;</Link></li>
          <li><Link href="/members/virtual-butler" className="text-brass-text hover:underline">Submit a Virtual Butler task &rarr;</Link></li>
          <li className="text-warm-gray">Genie for urgent requests (sticky bar, bottom-right)</li>
        </ul>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npm run test:run -- src/components/members/__tests__/WelcomeBanner.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/members/WelcomeBanner.tsx src/components/members/__tests__/WelcomeBanner.test.tsx
git commit -m "feat(members): add one-shot WelcomeBanner"
```

---

## Task 23: `<MembershipBanner />` component (TDD)

**Files:**
- Create: `src/components/members/MembershipBanner.tsx`
- Test: `src/components/members/__tests__/MembershipBanner.test.tsx`

Renders nothing when active and not pending-cancel; otherwise picks a variant. Self-contained: handles its own `POST /api/membership/pause` for the resume button and its own `POST /api/membership/portal` for portal actions, mirroring `PlanManager`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/members/__tests__/MembershipBanner.test.tsx
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MembershipBanner } from "../MembershipBanner";

const useMembershipMock = vi.fn();
vi.mock("@/hooks/useMembership", () => ({ useMembership: () => useMembershipMock() }));

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ url: "https://portal.example" }) }));
  Object.defineProperty(window, "location", { value: { assign: vi.fn() }, writable: true });
});
afterEach(() => vi.unstubAllGlobals());

describe("MembershipBanner", () => {
  it("renders nothing for active members not pending cancel", () => {
    useMembershipMock.mockReturnValue({ membership: { status: "active", cancelAtPeriodEnd: false, tier: { name: "Lite" } } });
    const { container } = render(<MembershipBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders past_due variant with copy + update-payment button", async () => {
    useMembershipMock.mockReturnValue({ membership: { status: "past_due", cancelAtPeriodEnd: false, tier: { name: "Pro" } } });
    render(<MembershipBanner />);
    expect(screen.getByText(/We couldn't charge your card/i)).toBeInTheDocument();
    expect(screen.getByText(/Pro/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Update payment method/i })).toBeInTheDocument();
  });

  it("renders paused variant with copy + resume button", () => {
    useMembershipMock.mockReturnValue({ membership: { status: "paused", cancelAtPeriodEnd: false, tier: { name: "Lite" } } });
    render(<MembershipBanner />);
    expect(screen.getByText(/Your membership is paused/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Resume membership/i })).toBeInTheDocument();
  });

  it("renders pending-cancel variant with reactivate button", () => {
    useMembershipMock.mockReturnValue({ membership: { status: "active", cancelAtPeriodEnd: true, tier: { name: "Frequent" }, billingPeriodEnd: "2026-06-25T00:00:00Z", personalHoursTotal: 20, personalHoursUsed: 12 } });
    render(<MembershipBanner />);
    expect(screen.getByText(/Cancellation scheduled/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Reactivate subscription/i })).toBeInTheDocument();
  });

  it("update payment button POSTs to portal and navigates", async () => {
    useMembershipMock.mockReturnValue({ membership: { status: "past_due", cancelAtPeriodEnd: false, tier: { name: "Pro" } } });
    render(<MembershipBanner />);
    fireEvent.click(screen.getByRole("button", { name: /Update payment method/i }));
    await vi.waitFor(() => expect(window.location.assign).toHaveBeenCalledWith("https://portal.example"));
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npm run test:run -- src/components/members/__tests__/MembershipBanner.test.tsx`
Expected: cannot find module.

- [ ] **Step 3: Write the implementation**

```tsx
// src/components/members/MembershipBanner.tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useMembership } from "@/hooks/useMembership";
import { Button } from "@/components/ui/button";

function formatDate(iso: string): string {
  if (!iso) return iso;
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function MembershipBanner() {
  const { membership } = useMembership();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  if (!membership) return null;
  const isActiveHappy = membership.status === "active" && !membership.cancelAtPeriodEnd;
  if (isActiveHappy) return null;

  async function openPortal() {
    setBusy(true);
    try {
      const res = await fetch("/api/membership/portal", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}),
      });
      if (!res.ok) { toast.error("Something went wrong. Please try again."); return; }
      const { url } = (await res.json()) as { url: string };
      window.location.assign(url);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally { setBusy(false); }
  }

  async function resume() {
    setBusy(true);
    try {
      const res = await fetch("/api/membership/pause", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "resume" }),
      });
      if (!res.ok) { toast.error("Something went wrong. Please try again."); return; }
      toast.success("Membership resumed");
      await queryClient.invalidateQueries({ queryKey: ["membership", user?.id] });
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally { setBusy(false); }
  }

  const tierName = membership.tier?.name ?? "Membership";

  let variant: React.ReactNode = null;
  if (membership.status === "past_due") {
    variant = (
      <div className="border border-red-700/50 bg-red-900/10 rounded-sm p-4">
        <p className="text-red-300 text-sm font-medium">We couldn&rsquo;t charge your card</p>
        <p className="text-warm-gray text-sm mt-2">
          Update your payment method to keep your {tierName} benefits. Your hours are paused in the meantime.
        </p>
        <Button className="mt-3 bg-brass text-charcoal hover:bg-brass-muted disabled:opacity-50" onClick={openPortal} disabled={busy}>
          Update payment method &rarr;
        </Button>
      </div>
    );
  } else if (membership.status === "paused") {
    variant = (
      <div className="border border-yellow-700/40 bg-yellow-900/10 rounded-sm p-4">
        <p className="text-yellow-200 text-sm font-medium">Your membership is paused</p>
        <p className="text-warm-gray text-sm mt-2">
          Billing is suspended. Member pricing returns when you resume.
        </p>
        <Button className="mt-3 bg-brass text-charcoal hover:bg-brass-muted disabled:opacity-50" onClick={resume} disabled={busy}>
          Resume membership
        </Button>
      </div>
    );
  } else if (membership.status === "active" && membership.cancelAtPeriodEnd) {
    const hoursLeft = (membership.personalHoursTotal ?? 0) - (membership.personalHoursUsed ?? 0);
    variant = (
      <div className="border border-yellow-700/40 bg-yellow-900/10 rounded-sm p-4">
        <p className="text-yellow-200 text-sm font-medium">Cancellation scheduled</p>
        <p className="text-warm-gray text-sm mt-2">
          Your {tierName} membership ends on {formatDate(membership.billingPeriodEnd)}. You can still use your remaining {hoursLeft}h until then.
        </p>
        <Button className="mt-3 bg-brass text-charcoal hover:bg-brass-muted disabled:opacity-50" onClick={openPortal} disabled={busy}>
          Reactivate subscription &rarr;
        </Button>
      </div>
    );
  }

  if (!variant) return null;

  return <div className="max-w-4xl mx-auto px-6 mt-4">{variant}</div>;
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npm run test:run -- src/components/members/__tests__/MembershipBanner.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/members/MembershipBanner.tsx src/components/members/__tests__/MembershipBanner.test.tsx
git commit -m "feat(members): add persistent MembershipBanner for past_due/paused/pending-cancel"
```

---

## Task 24: Mount banners in `members/layout.tsx`

**Files:**
- Modify: `src/app/members/layout.tsx`

The layout is a Server Component. `WelcomeBanner` uses `useSearchParams` and must be wrapped in `<Suspense>` (otherwise the build's static prerender step bails out — see bug-log entry 2026-05-24 for the same pattern in signup).

- [ ] **Step 1: Modify the layout**

```tsx
// src/app/members/layout.tsx (full replacement)
import type { Metadata } from "next";
import { Suspense } from "react";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { MembershipBanner } from "@/components/members/MembershipBanner";
import { WelcomeBanner } from "@/components/members/WelcomeBanner";

export const metadata: Metadata = {
  title: { default: "Members", template: "%s | Butlers Inc." },
};

export default function MembersLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <MembershipBanner />
      <Suspense fallback={null}>
        <WelcomeBanner />
      </Suspense>
      <main className="pt-2">{children}</main>
      <Footer />
    </>
  );
}
```

Note the `<main>` padding drops to `pt-2` because the Header is no longer the only thing above content (banner provides spacing). If QA flags vertical layout issues on pages without a banner (most pages, most of the time), restore `pt-20` on `<main>` and ensure banner spacing is additive.

- [ ] **Step 2: Run dev server and visit `/members/dashboard?welcome=1`**

Run: `npm run dev` (background) then open `http://localhost:3000/members/dashboard?welcome=1` while signed in.
Expected: Welcome card visible. Dismiss persists across reload.

- [ ] **Step 3: Run all tests**

Run: `npm run test:run`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/members/layout.tsx
git commit -m "feat(members): mount MembershipBanner + WelcomeBanner in layout"
```

---

## Task 25: Dashboard `?welcome=1` toast + URL replace

**Files:**
- Modify: `src/app/members/dashboard/page.tsx`
- Modify: `src/app/members/dashboard/__tests__/page.test.tsx`

- [ ] **Step 1: Add mocks + write the failing test**

In `src/app/members/dashboard/__tests__/page.test.tsx`, add the following mocks alongside the existing ones (skip the lines already present):

```tsx
import { toast } from "sonner";
import { useSearchParams, useRouter } from "next/navigation";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
// If the existing file already mocks "next/navigation", extend it; otherwise add:
vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(),
  useRouter: vi.fn(),
  usePathname: () => "/members/dashboard",
}));
```

Add the new test (use the existing render helper / test-utils import already in this file):

```tsx
it("fires welcome toast and replaces URL when ?welcome=1 is present", async () => {
  (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(new URLSearchParams("welcome=1"));
  const replace = vi.fn();
  (useRouter as ReturnType<typeof vi.fn>).mockReturnValue({ replace, push: vi.fn(), prefetch: vi.fn() });
  render(<MemberDashboard />);
  await vi.waitFor(() => {
    expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/Welcome/i));
    expect(replace).toHaveBeenCalledWith("/members/dashboard");
  });
});

it("does NOT fire welcome toast when ?welcome param is absent", async () => {
  (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(new URLSearchParams(""));
  const replace = vi.fn();
  (useRouter as ReturnType<typeof vi.fn>).mockReturnValue({ replace, push: vi.fn(), prefetch: vi.fn() });
  render(<MemberDashboard />);
  // Give effects a tick to flush
  await new Promise((r) => setTimeout(r, 10));
  expect(toast.success).not.toHaveBeenCalled();
  expect(replace).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run the tests, verify they fail**

Run: `npm run test:run -- src/app/members/dashboard/__tests__/page.test.tsx`
Expected: the new welcome assertions FAIL ("welcome" matcher not met).

- [ ] **Step 3: Modify the dashboard page**

In `src/app/members/dashboard/page.tsx`, add imports near the existing ones:

```tsx
import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
```

Inside the existing `MemberDashboard()` function (after the existing `useAuth` / `useMembership` calls), add:

```tsx
const searchParams = useSearchParams();
const router = useRouter();
useEffect(() => {
  if (searchParams?.get("welcome") === "1" && membership?.tier?.name) {
    toast.success(`Welcome to ${membership.tier.name}, your hours are ready`);
    router.replace("/members/dashboard");
  }
}, [searchParams, router, membership?.tier?.name]);
```

Then rename the existing exported function to be internal and add a Suspense-wrapped default export (mirrors `src/app/members/signup/page.tsx`'s pattern):

```tsx
// Replace:
//   export default function MemberDashboard() { ... }
// With:
function MemberDashboard() { /* existing body */ }

export default function MemberDashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-charcoal" />}>
      <MemberDashboard />
    </Suspense>
  );
}
```

This is necessary because `useSearchParams` requires a Suspense boundary somewhere up its tree — without it, Next 16's static prerender step fails the build (see `docs/bug-resolution-log.md` entry 2026-05-24 for the same pattern that broke a staging deploy).

- [ ] **Step 4: Run the test, verify it passes**

Run: `npm run test:run -- src/app/members/dashboard/__tests__/page.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/members/dashboard/page.tsx src/app/members/dashboard/__tests__/page.test.tsx
git commit -m "feat(dashboard): welcome toast + URL strip on ?welcome=1"
```

---

## Task 26: `PlanManager.tsx` — pause/resume toasts + `stashPortalSnapshot`

**Files:**
- Modify: `src/components/membership/PlanManager.tsx`
- Modify: `src/components/membership/__tests__/PlanManager.test.tsx` (extend if present; create only if missing)

- [ ] **Step 1: Write the failing tests**

If `src/components/membership/__tests__/PlanManager.test.tsx` does not yet exist, create it. Otherwise extend the existing file by adding the imports/mocks (if absent) and the two new `it()` blocks:

```tsx
// src/components/membership/__tests__/PlanManager.test.tsx
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";
import { PlanManager } from "../PlanManager";

const useMembershipMock = vi.fn();
vi.mock("@/hooks/useMembership", () => ({ useMembership: () => useMembershipMock() }));
vi.mock("@/context/AuthContext", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function renderManager() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <PlanManager />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  sessionStorage.clear();
  useMembershipMock.mockReturnValue({
    isLoading: false,
    membership: {
      status: "active",
      tier: { slug: "lite", name: "Lite" },
      personalHoursTotal: 10,
      personalHoursUsed: 2,
      billingPeriodEnd: "2026-06-25T00:00:00Z",
      stripeSubscriptionId: "sub_abc",
      cancelAtPeriodEnd: false,
    },
  });
});
afterEach(() => vi.clearAllMocks());

describe("PlanManager", () => {
  it("toasts 'Membership paused' on successful pause", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }));
    renderManager();
    fireEvent.click(screen.getByRole("button", { name: /Pause membership/i }));
    await vi.waitFor(() => expect(toast.success).toHaveBeenCalledWith("Membership paused"));
    vi.unstubAllGlobals();
  });

  it("stashes a portal snapshot before navigating to portal", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ url: "https://portal.example" }) }));
    Object.defineProperty(window, "location", { value: { assign: vi.fn() }, writable: true });
    renderManager();
    fireEvent.click(screen.getByRole("button", { name: /Manage subscription/i }));
    await vi.waitFor(() => {
      const raw = sessionStorage.getItem("butlers.portal.snapshot.v1");
      expect(raw).toBeTruthy();
      const snap = JSON.parse(raw as string);
      expect(snap).toMatchObject({ status: "active", tierSlug: "lite", cancelAtPeriodEnd: false });
    });
    vi.unstubAllGlobals();
  });
});
```

- [ ] **Step 2: Modify PlanManager**

Add to imports:

```tsx
import { toast } from "sonner";
import { stashPortalSnapshot } from "@/lib/membership/portal-snapshot";
```

Inside `openPortal`, before the fetch call:

```tsx
if (membership) {
  stashPortalSnapshot({
    status: membership.status,
    tierSlug: membership.tier.slug,
    cancelAtPeriodEnd: membership.cancelAtPeriodEnd,
  });
}
```

Inside `pauseOrResume`, after the successful fetch:

```tsx
toast.success(action === "pause" ? "Membership paused" : "Membership resumed");
```

- [ ] **Step 3: Run the tests, verify they pass**

Run: `npm run test:run -- src/components/membership/__tests__/PlanManager.test.tsx`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/membership/PlanManager.tsx src/components/membership/__tests__/PlanManager.test.tsx
git commit -m "feat(plan-manager): success toasts + portal snapshot stash"
```

---

## Task 27: Settings page — consume snapshot + diff-toast on mount

**Files:**
- Modify: `src/app/members/settings/page.tsx`
- Modify or create: `src/app/members/settings/__tests__/page.test.tsx`

The new effect runs on mount: `consumePortalSnapshot()`. If a snapshot is present, diff against `useMembership()`. If `kind: "no_change"` and webhook may not have landed, poll `useQueryClient().invalidateQueries(...)` once per 800ms for up to 5s, re-diffing each tick. Final result: toast based on diff kind, or generic info toast.

- [ ] **Step 1: Write the failing test**

If `src/app/members/settings/__tests__/page.test.tsx` does not yet exist, create it. Otherwise add the imports/mocks (if absent) and the new test.

```tsx
// src/app/members/settings/__tests__/page.test.tsx
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";
import { stashPortalSnapshot } from "@/lib/membership/portal-snapshot";
import SettingsPage from "../page";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() } }));

const useMembershipMock = vi.fn();
vi.mock("@/hooks/useMembership", () => ({ useMembership: () => useMembershipMock() }));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "u1", email: "ada@example.com", user_metadata: { name: "Ada", phone: "" } },
    loading: false,
    supabase: { auth: { updateUser: vi.fn() } },
  }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><SettingsPage /></QueryClientProvider>);
}

beforeEach(() => sessionStorage.clear());
afterEach(() => vi.clearAllMocks());

describe("Settings page portal-return toast", () => {
  it("toasts 'Plan changed to pro' when the snapshot diff is plan_changed", async () => {
    stashPortalSnapshot({ status: "active", tierSlug: "lite", cancelAtPeriodEnd: false });
    useMembershipMock.mockReturnValue({
      membership: {
        status: "active", tier: { slug: "pro", name: "Pro" },
        billingPeriodEnd: "2026-06-25T00:00:00Z", cancelAtPeriodEnd: false,
      },
    });
    renderPage();
    await vi.waitFor(() => expect(toast.success).toHaveBeenCalledWith("Plan changed to pro"));
  });

  it("toasts 'Cancellation scheduled for ...' when snapshot diff is cancel_scheduled", async () => {
    stashPortalSnapshot({ status: "active", tierSlug: "lite", cancelAtPeriodEnd: false });
    useMembershipMock.mockReturnValue({
      membership: {
        status: "active", tier: { slug: "lite", name: "Lite" },
        billingPeriodEnd: "2026-06-25T00:00:00Z", cancelAtPeriodEnd: true,
      },
    });
    renderPage();
    await vi.waitFor(() => expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/Cancellation scheduled for /)));
  });

  it("does nothing when no snapshot is stashed", async () => {
    useMembershipMock.mockReturnValue({
      membership: { status: "active", tier: { slug: "lite", name: "Lite" }, billingPeriodEnd: "2026-06-25T00:00:00Z", cancelAtPeriodEnd: false },
    });
    renderPage();
    await new Promise((r) => setTimeout(r, 50));
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.info).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Modify the settings page**

Add to imports:

```tsx
import { consumePortalSnapshot, diffSnapshot, type Snapshot } from "@/lib/membership/portal-snapshot";
import { useMembership } from "@/hooks/useMembership";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
```

Add a new effect after the existing `useEffect`:

```tsx
const { membership } = useMembership();
const queryClient = useQueryClient();

useEffect(() => {
  const snap = consumePortalSnapshot();
  if (!snap) return;
  if (!membership) return;

  let attempts = 0;
  const MAX = 6;
  const tick = () => {
    const curr: Snapshot = {
      status: membership.status,
      tierSlug: membership.tier.slug,
      cancelAtPeriodEnd: membership.cancelAtPeriodEnd,
    };
    const diff = diffSnapshot(snap, curr);
    if (diff.kind === "plan_changed") return toast.success(`Plan changed to ${curr.tierSlug}`);
    if (diff.kind === "cancel_scheduled") return toast.success(`Cancellation scheduled for ${new Date(membership.billingPeriodEnd).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`);
    if (diff.kind === "cancel_reversed") return toast.success("Cancellation reversed");
    if (diff.kind === "cancelled") return toast.success("Membership cancelled");
    attempts += 1;
    if (attempts >= MAX) {
      return toast.info("We've updated your subscription. Check your email for confirmation.");
    }
    queryClient.invalidateQueries({ queryKey: ["membership", user?.id] });
    setTimeout(tick, 800);
  };
  tick();
  // We deliberately do not put membership in the deps array: this effect should
  // run once on mount with whatever the initial snapshot is. The polling re-reads
  // current membership through queryClient invalidation.
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

- [ ] **Step 3: Run the test, verify it passes**

Run: `npm run test:run -- src/app/members/settings/__tests__/page.test.tsx`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/members/settings/page.tsx src/app/members/settings/__tests__/page.test.tsx
git commit -m "feat(settings): consume portal snapshot + diff-toast on mount"
```

---

## Task 28: Mock simulate-portal — add `evt_mock_<uuid>` to all fired webhooks

**Files:**
- Modify: `src/app/payment/simulate-portal/page.tsx`

- [ ] **Step 1: Add an `id` field to each fired webhook body**

In `cancelAction`, `changePlanAction`, `reactivateAction`, `updateCardFailAction`, `triggerInvoicePaidAction`, add `id: \`evt_mock_${crypto.randomUUID()}\`` to the object passed into `fireWebhook`. Example for `cancelAction`:

```ts
await fireWebhook({
  id: `evt_mock_${crypto.randomUUID()}`,
  type: "customer.subscription.updated",
  created: now,
  data: { ... },
});
```

Repeat for the other four actions.

Note: the existing `WebhookEvent` type union does not declare `id` (Stripe parses raw bodies and produces the typed envelope, so the type lives on Stripe's side, not ours). The mock simulator's body is JSON; the receiver hands it to `gateway.parseWebhookEvent`. For mock mode, the gateway is permissive — extra fields pass through harmlessly. The `id` will be available to the notifier via the event handler's prior knowledge (we pass it explicitly into `notifyLifecycle` as `eventId`, derived from a per-event-type prefix in Task 19).

- [ ] **Step 2: Sanity-test that mock portal still works**

Run: `npm run dev` (background) then sign in, navigate to `/members/settings`, click Manage subscription → click Cancel → confirm you return to `/members/settings` without a 500 in logs.
Expected: redirect succeeds; server logs show no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/payment/simulate-portal/page.tsx
git commit -m "feat(simulate-portal): include evt_mock_<uuid> on every fired webhook for idempotency keys"
```

---

## Task 29: End-to-end manual QA

**Files:** none (verification only). Run through this checklist; record failures as new commits.

- [ ] **Step 1: Run dev server with RESEND_API_KEY pointed at a sandboxed inbox**

```bash
export RESEND_API_KEY=re_test_...   # use a sandboxed key that lands in a test inbox
export MEMBERSHIP_ADMIN_NOTIFY_EMAIL=you@example.com
npm run dev
```

- [ ] **Step 2: Welcome flow**

1. Sign up with a fresh email.
2. Go to `/membership`, choose Lite, complete the mock checkout.
3. Land on `/members/dashboard?welcome=1`.

Expected: success toast ("Welcome to Lite, your hours are ready"), URL strips back to `/members/dashboard`, dismissible welcome card visible. Inbox contains member "Welcome" + admin "New Lite member".

- [ ] **Step 3: Pause / Resume**

1. From `/members/settings`, click Pause membership.
2. Navigate to `/members/dashboard`, then `/members/personal-butler`.

Expected: success toast on settings; amber banner visible on dashboard AND personal-butler. Inbox has member "Pause confirmed" + admin "Membership paused".

Click Resume from the banner (or settings).
Expected: success toast; banner disappears across all member pages. Member-only inbox has "Welcome back".

- [ ] **Step 4: Payment failed**

From mock portal (`/payment/simulate-portal?customer_id=<your-customer-id>`), click "Update card (simulate decline)".

Expected: red `past_due` banner appears on every `/members/*` page. Inbox has member "Action needed" + admin "Payment failed".

Click "Trigger invoice.paid (recover from past_due)".
Expected: banner clears; no email (no transition from past_due back to active in our renewal logic unless period rolls — sanity check this matches spec: `invoice.paid` only fires `renewed` when period rolls; recovery from past_due flips status via the handler but no email per the noop branch — confirm no email arrives).

- [ ] **Step 5: Cancel / Reactivate**

From mock portal, click Cancel subscription.

Expected: redirect to `/members/settings`; toast "Cancellation scheduled for {date}"; amber `pending-cancel` banner across all `/members/*`. Inbox has member "Cancels on {date}" + admin "Cancellation scheduled".

From mock portal, click Reactivate.
Expected: redirect to settings; toast "Cancellation reversed"; banner gone. No emails (cancel_reversed is member-no-email + admin-no-email per spec).

- [ ] **Step 6: Plan change**

From mock portal, click "Change to Pro".

Expected: redirect to settings; toast "Plan changed to pro"; PlanManager reflects Pro tier. Member inbox has "Plan changed: Lite to Pro". No admin email (plan-change skips admin per spec).

- [ ] **Step 7: Idempotency**

Re-click any simulate-portal button immediately after the first click.

Expected: same UX; **NO duplicate emails** (check `lifecycle_email_log` directly with `psql` to confirm only one row per `(event_id, transition, recipient)`).

- [ ] **Step 8: If any of steps 2-7 fail, fix and re-commit before proceeding**

---

## Task 30: CLAUDE.md update

**Files:**
- Modify: `CLAUDE.md`

Document the new env var, the lifecycle-notifier pattern, and update the architecture tree.

- [ ] **Step 1: Add env var entry under "Environment Variables"**

Add (after `ADMIN_EMAILS`):

```markdown
- `MEMBERSHIP_ADMIN_NOTIFY_EMAIL` — admin recipient for membership lifecycle notifications (new member, payment failed, pause, cancellation scheduled, cancellation final). Resolution order: this var, then `BOOKING_ADMIN_NOTIFY_EMAIL`, then first email in `ADMIN_EMAILS`.
```

- [ ] **Step 2: Add a new bullet under "Key Patterns"**

```markdown
- **Lifecycle notifications:** Every membership webhook handler in `src/lib/payment/webhook-handler.ts` calls `notifyLifecycle(...)` after its DB write. Transition detection is a pure function in `src/lib/membership/lifecycle-transitions.ts` returning a discriminated `Transition` union. The notifier (`src/lib/membership/lifecycle-notifier.ts`) inserts into `lifecycle_email_log` first (composite PK `(event_id, transition, recipient)`); on conflict it skips the Resend send. Resend 5xx/network failures DELETE the log row so the next Stripe retry re-attempts; Resend 4xx (permanent) failures KEEP the row to prevent retry storms and log `lifecycle.email.permanent_failure`. Notifier errors are swallowed by each webhook handler's try/catch so DB-write correctness is never blocked on email plumbing.
- **Membership banner reach:** `<MembershipBanner />` is mounted in `src/app/members/layout.tsx`, so the past_due / paused / pending-cancel state is visible across every `/members/*` page, not only the settings page. `<WelcomeBanner />` (gated by `?welcome=1` + a localStorage flag) lives in the same layout, wrapped in `<Suspense>` because it uses `useSearchParams`.
- **Portal-return acknowledgement:** `PlanManager` calls `stashPortalSnapshot(membership)` before navigating to Stripe Portal; on return to `/members/settings`, the page calls `consumePortalSnapshot()` and diffs against current membership state to toast the specific change (plan_changed, cancel_scheduled, cancel_reversed, cancelled). If the webhook hasn't landed within ~5s, falls back to a generic info toast.
```

- [ ] **Step 3: Update the Architecture tree**

Add under `src/lib/membership/`:

```
src/lib/membership/
  ...existing...
  lifecycle-transitions.ts      # Pure transition detection from webhook event + row diff
  lifecycle-notifier.ts         # Orchestrator: idempotency log + Resend send + error handling
  admin-recipient.ts            # MEMBERSHIP_ADMIN_NOTIFY_EMAIL → BOOKING_ADMIN_NOTIFY_EMAIL → ADMIN_EMAILS[0]
  portal-snapshot.ts            # sessionStorage pre/post-portal snapshot + diff
```

Add under `src/components/`:

```
src/components/
  ...existing...
  members/
    MembershipBanner.tsx        # Persistent banner for past_due / paused / pending-cancel; mounted from members/layout
    WelcomeBanner.tsx           # One-shot welcome card on ?welcome=1
```

Add under `src/emails/`:

```
src/emails/
  ...existing...
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
```

Add under `supabase/migrations/`:

```
011_lifecycle_email_log.sql     # Idempotency log for lifecycle emails
```

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(claude-md): document lifecycle notifier pattern + env var + file inventory"
```

---

## Done

After Task 30, the branch contains the full lifecycle confirmations system. Run `npm run test:run` one final time to ensure the whole suite is green, then open a PR against `staging` (per CLAUDE.md, never merge to main without approval).
