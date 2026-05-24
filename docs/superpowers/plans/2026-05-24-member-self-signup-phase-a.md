# Member self-signup — Phase A (funnel + provisioning) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an end-to-end self-serve subscribe funnel: a fresh visitor lands on `/membership`, picks a tier, completes (mock) Stripe Checkout, and arrives on the members dashboard with an active membership row provisioned by the webhook handler.

**Architecture:** Stripe-shaped subscription flow gated behind the existing `PaymentGateway` interface. Mock gateway today; real Stripe later as a focused swap PR (StripeGateway ships as a tested stub). Provisioning happens in `/api/webhooks/stripe`, not the success URL — success URL just polls until the membership row appears. Three new DB columns on `memberships` (`stripe_customer_id`, `stripe_subscription_id`, `cancel_at_period_end`, `paused_at`) plus a `past_due` status. Self-serve actions (cancel/pause/upgrade) come in Phase B.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase (auth + Postgres), Tailwind v4, Vitest + Testing Library. Mock payment gateway extends existing pattern in `src/lib/payment/`.

**Spec:** `docs/superpowers/specs/2026-05-24-member-self-signup-design.md`

---

## File Structure

**Each file has one responsibility. Files that change together live together.**

```
src/lib/membership/
  tier-pricing.ts                 # Resolve TierSlug → Stripe price ID (env or mock)
  __tests__/tier-pricing.test.ts

src/lib/payment/
  types.ts                        # PaymentGateway interface + WebhookEvent union (moved here, was inline in gateway.ts)
  webhook-handler.ts              # Pure functions per webhook event type
  mock-gateway.ts                 # EXTEND: subscription state, parseWebhookEvent
  stripe-gateway.ts               # NEW: stub throwing "not yet implemented" for every method
  gateway.ts                      # MODIFY: route to mock or stripe based on env
  __tests__/webhook-handler.test.ts
  __tests__/mock-gateway.test.ts  # EXTEND existing
  __tests__/stripe-gateway.test.ts

src/app/api/membership/checkout/
  route.ts                        # POST → creates subscription Checkout Session
  __tests__/route.test.ts

src/app/api/webhooks/stripe/
  route.ts                        # POST → signature-gated, dispatches to webhook-handler
  __tests__/route.test.ts

src/app/membership/
  page.tsx                        # Public pricing page (3 tier cards)
  checkout/[tier]/page.tsx        # Server component: creates session, 307s to gateway URL

src/app/members/checkout/success/
  page.tsx                        # "Activating…" wrapper
  CheckoutActivating.tsx          # Client component: polls /api/members/me
  __tests__/CheckoutActivating.test.tsx

src/components/membership/
  TierCard.tsx                    # One tier card (price, hours, tasks, CTA)
  TierComparison.tsx              # 3-up grid of TierCards
  __tests__/TierCard.test.tsx
  __tests__/TierComparison.test.tsx

src/app/payment/simulate/page.tsx  # EXTEND: handle ?type=subscription → POST synthetic webhook

src/components/landing/Header.tsx  # MODIFY: "Join" → /membership
src/app/page.tsx                   # MODIFY: hero CTA → /membership
src/app/members/dashboard/page.tsx # MODIFY: show "Choose a plan" card when no membership
src/app/members/signup/SignupPage.tsx  # MODIFY: honour ?next= after signup
src/types/membership.ts            # MODIFY: extend MembershipStatus to include 'past_due'

supabase/migrations/
  007_membership_subscriptions.sql # NEW: schema additions
```

---

## Task 1: Database migration — extend `memberships` schema

**Files:**
- Create: `supabase/migrations/007_membership_subscriptions.sql`
- Modify: `src/types/membership.ts` (extend `MembershipStatus`)
- Test: `src/types/__tests__/membership.test.ts` (extend)

- [ ] **Step 1: Write the failing type test**

Edit `src/types/__tests__/membership.test.ts` — add this case to the existing describe block:

```ts
it("MembershipStatus includes past_due for payment failures", () => {
  const valid: MembershipStatus[] = ["active", "paused", "cancelled", "past_due"];
  expect(valid).toHaveLength(4);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/types/__tests__/membership.test.ts`
Expected: FAIL — TS error "Type 'past_due' is not assignable to type 'MembershipStatus'"

- [ ] **Step 3: Extend the type**

In `src/types/membership.ts`, change:

```ts
export type MembershipStatus = "active" | "paused" | "cancelled";
```

to:

```ts
export type MembershipStatus = "active" | "paused" | "cancelled" | "past_due";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/types/__tests__/membership.test.ts`
Expected: PASS

- [ ] **Step 5: Write the migration**

Create `supabase/migrations/007_membership_subscriptions.sql`:

```sql
-- Self-serve subscriptions: link memberships to Stripe customer + subscription,
-- track cancel-at-period-end + paused state, allow 'past_due' status from invoice failures.

ALTER TABLE memberships
  ADD COLUMN stripe_customer_id text UNIQUE,
  ADD COLUMN stripe_subscription_id text UNIQUE,
  ADD COLUMN cancel_at_period_end boolean NOT NULL DEFAULT false,
  ADD COLUMN paused_at timestamptz;

ALTER TABLE memberships
  DROP CONSTRAINT IF EXISTS memberships_status_check;
ALTER TABLE memberships
  ADD CONSTRAINT memberships_status_check
  CHECK (status IN ('active', 'paused', 'cancelled', 'past_due'));

CREATE INDEX IF NOT EXISTS idx_memberships_stripe_subscription_id
  ON memberships(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_memberships_stripe_customer_id
  ON memberships(stripe_customer_id);
```

- [ ] **Step 6: Update the in-code Membership interface**

In `src/types/membership.ts`, extend the `Membership` interface (add fields after `updatedAt`):

```ts
export interface Membership {
  id: string;
  userId: string;
  tierId: string;
  tier: MembershipTier;
  personalHoursTotal: number;
  personalHoursUsed: number;
  virtualTasksTotal: number;
  virtualTasksUsed: number;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  status: MembershipStatus;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  cancelAtPeriodEnd: boolean;
  pausedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 7: Run the full test suite**

Run: `npm run test:run`
Expected: PASS — 369 → 370 (one new test). Some existing tests may need touch-ups in later tasks; if any fail here, note them but don't fix yet.

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/007_membership_subscriptions.sql src/types/membership.ts src/types/__tests__/membership.test.ts
git commit -m "feat(membership): schema additions for Stripe subscriptions + past_due status"
```

---

## Task 2: Tier pricing helper (`tier-pricing.ts`)

**Files:**
- Create: `src/lib/membership/tier-pricing.ts`
- Test: `src/lib/membership/__tests__/tier-pricing.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/membership/__tests__/tier-pricing.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("getTierPriceId", () => {
  const envBackup = {
    lite: process.env.STRIPE_PRICE_LITE,
    essential: process.env.STRIPE_PRICE_ESSENTIAL,
    heavy: process.env.STRIPE_PRICE_HEAVY,
  };

  beforeEach(() => {
    vi.resetModules();
    delete process.env.STRIPE_PRICE_LITE;
    delete process.env.STRIPE_PRICE_ESSENTIAL;
    delete process.env.STRIPE_PRICE_HEAVY;
  });

  afterEach(() => {
    if (envBackup.lite) process.env.STRIPE_PRICE_LITE = envBackup.lite;
    if (envBackup.essential) process.env.STRIPE_PRICE_ESSENTIAL = envBackup.essential;
    if (envBackup.heavy) process.env.STRIPE_PRICE_HEAVY = envBackup.heavy;
  });

  it("returns the env var value when set", async () => {
    process.env.STRIPE_PRICE_LITE = "price_real_lite_123";
    const { getTierPriceId } = await import("../tier-pricing");
    expect(getTierPriceId("lite")).toBe("price_real_lite_123");
  });

  it("falls back to mock_<slug> when env var is unset", async () => {
    const { getTierPriceId } = await import("../tier-pricing");
    expect(getTierPriceId("lite")).toBe("mock_lite");
    expect(getTierPriceId("essential")).toBe("mock_essential");
    expect(getTierPriceId("heavy")).toBe("mock_heavy");
  });

  it("throws for an unknown slug", async () => {
    const { getTierPriceId } = await import("../tier-pricing");
    // @ts-expect-error — testing runtime guard
    expect(() => getTierPriceId("ultra")).toThrow(/unknown tier slug/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/membership/__tests__/tier-pricing.test.ts`
Expected: FAIL — "Cannot find module '../tier-pricing'"

- [ ] **Step 3: Write the implementation**

Create `src/lib/membership/tier-pricing.ts`:

```ts
import type { TierSlug } from "@/types/membership";

const ENV_KEYS: Record<TierSlug, string> = {
  lite: "STRIPE_PRICE_LITE",
  essential: "STRIPE_PRICE_ESSENTIAL",
  heavy: "STRIPE_PRICE_HEAVY",
};

export function getTierPriceId(slug: TierSlug): string {
  const envKey = ENV_KEYS[slug];
  if (!envKey) {
    throw new Error(`unknown tier slug: ${slug}`);
  }
  return process.env[envKey] ?? `mock_${slug}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/membership/__tests__/tier-pricing.test.ts`
Expected: PASS — 3 tests

- [ ] **Step 5: Commit**

```bash
git add src/lib/membership/tier-pricing.ts src/lib/membership/__tests__/tier-pricing.test.ts
git commit -m "feat(membership): tier-pricing helper resolves Stripe price IDs per tier"
```

---

## Task 3: Extend `PaymentGateway` interface + `WebhookEvent` union

**Files:**
- Create: `src/lib/payment/types.ts`
- Modify: `src/lib/payment/gateway.ts` (move re-exports)
- Modify: `src/lib/payment/mock-gateway.ts` (update import path only — no behavior yet)

**Rationale:** Co-locate gateway interface + event types in one focused file. Subsequent tasks add the implementations.

- [ ] **Step 1: Read the existing interface**

Check current location of `PaymentGateway` interface and types used by `MockPaymentGateway`:

Run: `grep -rn "PaymentGateway\|CheckoutSessionRequest\|CheckoutSessionResult" src/lib/ --include="*.ts" | head`

Note the file that defines them today (likely `src/lib/pricing/types.ts`). The new `src/lib/payment/types.ts` will replace it; we'll re-export from the old path for one task to avoid a giant rename in this step.

- [ ] **Step 2: Create the new types file**

Create `src/lib/payment/types.ts`:

```ts
import type { TierSlug } from "@/types/membership";

// ── one-off booking payments (existing) ─────────────────────
export interface CheckoutSessionRequest {
  amount: number;
  currency: string;
  bookingReference: string;
  description: string;
  customerEmail: string;
  successUrl?: string;
  cancelUrl?: string;
}

export interface CheckoutSessionResult {
  sessionId: string;
  url: string;
}

// ── subscriptions (new) ──────────────────────────────────────
export interface SubscriptionCheckoutRequest {
  tier: TierSlug;
  priceId: string;
  userId: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
}

export interface PortalSessionRequest {
  customerId: string;
  returnUrl: string;
}

// ── webhook events (new, discriminated union) ────────────────
export interface CheckoutSessionData {
  id: string;
  client_reference_id: string | null;
  customer: string;
  subscription: string;
  current_period_start: number;  // unix seconds
  current_period_end: number;
  line_items: Array<{ price: { id: string } }>;
}

export interface SubscriptionData {
  id: string;
  customer: string;
  status: "active" | "past_due" | "canceled" | "paused" | "trialing" | "unpaid" | "incomplete" | "incomplete_expired";
  cancel_at_period_end: boolean;
  current_period_start: number;
  current_period_end: number;
  pause_collection: { behavior: string } | null;
  items: { data: Array<{ price: { id: string } }> };
}

export interface InvoiceData {
  id: string;
  customer: string;
  subscription: string | null;
  period_start: number;
  period_end: number;
  status: "draft" | "open" | "paid" | "uncollectible" | "void";
}

export type WebhookEvent =
  | { type: "checkout.session.completed"; created: number; data: CheckoutSessionData }
  | { type: "customer.subscription.updated"; created: number; data: SubscriptionData }
  | { type: "customer.subscription.deleted"; created: number; data: SubscriptionData }
  | { type: "invoice.paid"; created: number; data: InvoiceData }
  | { type: "invoice.payment_failed"; created: number; data: InvoiceData }
  | { type: "unhandled"; created: number; rawType: string };

// ── gateway interface ────────────────────────────────────────
export interface PaymentGateway {
  createCheckoutSession(req: CheckoutSessionRequest): Promise<CheckoutSessionResult>;
  verifyPayment(sessionId: string): Promise<{ verified: boolean; paymentIntentId?: string }>;

  createSubscriptionCheckoutSession(req: SubscriptionCheckoutRequest): Promise<CheckoutSessionResult>;
  createPortalSession(req: PortalSessionRequest): Promise<{ url: string }>;
  pauseSubscription(subscriptionId: string): Promise<void>;
  resumeSubscription(subscriptionId: string): Promise<void>;
  parseWebhookEvent(rawBody: string, signature: string | null): Promise<WebhookEvent>;
}
```

- [ ] **Step 3: Update `src/lib/pricing/types.ts` to re-export**

Open `src/lib/pricing/types.ts` and replace its `PaymentGateway` + related exports with a re-export to keep existing imports working:

```ts
// Re-exports for back-compat; canonical home is now @/lib/payment/types
export type {
  CheckoutSessionRequest,
  CheckoutSessionResult,
  PaymentGateway,
} from "@/lib/payment/types";
```

(Keep any other unrelated exports in this file untouched.)

- [ ] **Step 4: Verify nothing broke**

Run: `npm run test:run`
Expected: PASS — same count as before Task 1 + the one new test from Task 1 = 370. Type errors mean an import was missed; fix them.

- [ ] **Step 5: Commit**

```bash
git add src/lib/payment/types.ts src/lib/pricing/types.ts
git commit -m "refactor(payment): extract PaymentGateway interface + WebhookEvent union to src/lib/payment/types"
```

---

## Task 4: Extend `MockPaymentGateway` with subscription methods

**Files:**
- Modify: `src/lib/payment/mock-gateway.ts`
- Modify: `src/lib/payment/__tests__/mock-gateway.test.ts`

- [ ] **Step 1: Write failing tests for the new methods**

Add to `src/lib/payment/__tests__/mock-gateway.test.ts` (inside the existing top-level `describe("MockPaymentGateway")`):

```ts
describe("subscription methods", () => {
  it("createSubscriptionCheckoutSession returns a mock simulator URL with the right params", async () => {
    const gw = new MockPaymentGateway();
    const result = await gw.createSubscriptionCheckoutSession({
      tier: "lite",
      priceId: "mock_lite",
      userId: "user-123",
      customerEmail: "test@example.com",
      successUrl: "https://example.com/success?session_id={CHECKOUT_SESSION_ID}",
      cancelUrl: "https://example.com/membership",
    });
    expect(result.url).toMatch(/\/payment\/simulate\?/);
    expect(result.url).toContain("type=subscription");
    expect(result.url).toContain("tier=lite");
    expect(result.url).toContain("user_id=user-123");
    expect(result.sessionId).toMatch(/^mock_sub_session_/);
  });

  it("createPortalSession returns a mock portal URL", async () => {
    const gw = new MockPaymentGateway();
    const result = await gw.createPortalSession({
      customerId: "mock_cus_123",
      returnUrl: "https://example.com/members/settings",
    });
    expect(result.url).toMatch(/\/payment\/simulate-portal\?/);
    expect(result.url).toContain("customer_id=mock_cus_123");
  });

  it("pauseSubscription + resumeSubscription toggle in-memory state without throwing", async () => {
    const gw = new MockPaymentGateway();
    await expect(gw.pauseSubscription("mock_sub_123")).resolves.toBeUndefined();
    await expect(gw.resumeSubscription("mock_sub_123")).resolves.toBeUndefined();
  });

  it("parseWebhookEvent accepts an unsigned body in mock mode and returns the parsed event", async () => {
    const gw = new MockPaymentGateway();
    const body = JSON.stringify({
      type: "checkout.session.completed",
      created: 1717000000,
      data: { id: "cs_123", client_reference_id: "user-1", customer: "cus_1", subscription: "sub_1", current_period_start: 1717000000, current_period_end: 1719678400, line_items: [{ price: { id: "mock_lite" } }] },
    });
    const event = await gw.parseWebhookEvent(body, null);
    expect(event.type).toBe("checkout.session.completed");
  });

  it("parseWebhookEvent returns { type: 'unhandled' } for unknown event types", async () => {
    const gw = new MockPaymentGateway();
    const body = JSON.stringify({ type: "customer.created", created: 1717000000, data: {} });
    const event = await gw.parseWebhookEvent(body, null);
    expect(event.type).toBe("unhandled");
    expect(event).toMatchObject({ rawType: "customer.created" });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/payment/__tests__/mock-gateway.test.ts`
Expected: FAIL — "createSubscriptionCheckoutSession is not a function" etc.

- [ ] **Step 3: Extend the mock gateway**

Update `src/lib/payment/mock-gateway.ts` — change the import line to use `@/lib/payment/types` and add the new methods:

```ts
import type {
  PaymentGateway,
  CheckoutSessionRequest,
  CheckoutSessionResult,
  SubscriptionCheckoutRequest,
  PortalSessionRequest,
  WebhookEvent,
} from "@/lib/payment/types";

const HANDLED_TYPES = new Set([
  "checkout.session.completed",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
]);

export class MockPaymentGateway implements PaymentGateway {
  private sessions = new Set<string>();

  async createCheckoutSession(request: CheckoutSessionRequest): Promise<CheckoutSessionResult> {
    // ... existing implementation unchanged ...
    const sessionId = `mock_session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.sessions.add(sessionId);
    const params = new URLSearchParams({
      session_id: sessionId,
      amount: String(request.amount),
      currency: request.currency,
      ref: request.bookingReference,
      description: request.description,
      email: request.customerEmail,
    });
    return { sessionId, url: `/payment/simulate?${params.toString()}` };
  }

  async verifyPayment(sessionId: string) {
    // ... existing implementation unchanged ...
    if (!sessionId || !this.sessions.has(sessionId)) return { verified: false };
    this.sessions.delete(sessionId);
    return { verified: true, paymentIntentId: `mock_pi_${Date.now()}` };
  }

  async createSubscriptionCheckoutSession(req: SubscriptionCheckoutRequest): Promise<CheckoutSessionResult> {
    const sessionId = `mock_sub_session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const params = new URLSearchParams({
      type: "subscription",
      session_id: sessionId,
      tier: req.tier,
      price_id: req.priceId,
      user_id: req.userId,
      email: req.customerEmail,
      success_url: req.successUrl,
      cancel_url: req.cancelUrl,
    });
    return { sessionId, url: `/payment/simulate?${params.toString()}` };
  }

  async createPortalSession(req: PortalSessionRequest): Promise<{ url: string }> {
    const params = new URLSearchParams({
      customer_id: req.customerId,
      return_url: req.returnUrl,
    });
    return { url: `/payment/simulate-portal?${params.toString()}` };
  }

  async pauseSubscription(_subscriptionId: string): Promise<void> {
    // Mock: no-op — synthetic webhook from the portal simulator will sync state
  }

  async resumeSubscription(_subscriptionId: string): Promise<void> {
    // Mock: no-op — synthetic webhook from the portal simulator will sync state
  }

  async parseWebhookEvent(rawBody: string, _signature: string | null): Promise<WebhookEvent> {
    const parsed = JSON.parse(rawBody);
    const type = parsed.type as string;
    if (HANDLED_TYPES.has(type)) {
      return parsed as WebhookEvent;
    }
    return { type: "unhandled", created: parsed.created ?? Date.now() / 1000, rawType: type };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/payment/__tests__/mock-gateway.test.ts`
Expected: PASS — existing tests + 5 new tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/payment/mock-gateway.ts src/lib/payment/__tests__/mock-gateway.test.ts
git commit -m "feat(payment): mock gateway supports subscription checkout, portal, pause/resume, webhook parsing"
```

---

## Task 5: `StripeGateway` stub + contract tests

**Files:**
- Create: `src/lib/payment/stripe-gateway.ts`
- Create: `src/lib/payment/__tests__/stripe-gateway.test.ts`

**Rationale:** Document the contract for the future real implementation. Each method throws a specific message; tests assert the message so the future Stripe wiring PR has a self-revealing checklist.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/payment/__tests__/stripe-gateway.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { StripeGateway } from "../stripe-gateway";

describe("StripeGateway (stub)", () => {
  const gw = new StripeGateway();

  it("createCheckoutSession throws not-yet-implemented", async () => {
    await expect(gw.createCheckoutSession({} as never)).rejects.toThrow(/not yet implemented/i);
  });

  it("verifyPayment throws not-yet-implemented", async () => {
    await expect(gw.verifyPayment("any")).rejects.toThrow(/not yet implemented/i);
  });

  it("createSubscriptionCheckoutSession throws not-yet-implemented", async () => {
    await expect(gw.createSubscriptionCheckoutSession({} as never)).rejects.toThrow(/not yet implemented/i);
  });

  it("createPortalSession throws not-yet-implemented", async () => {
    await expect(gw.createPortalSession({} as never)).rejects.toThrow(/not yet implemented/i);
  });

  it("pauseSubscription throws not-yet-implemented", async () => {
    await expect(gw.pauseSubscription("any")).rejects.toThrow(/not yet implemented/i);
  });

  it("resumeSubscription throws not-yet-implemented", async () => {
    await expect(gw.resumeSubscription("any")).rejects.toThrow(/not yet implemented/i);
  });

  it("parseWebhookEvent throws not-yet-implemented", async () => {
    await expect(gw.parseWebhookEvent("{}", null)).rejects.toThrow(/not yet implemented/i);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/payment/__tests__/stripe-gateway.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the stub**

Create `src/lib/payment/stripe-gateway.ts`:

```ts
import type {
  PaymentGateway,
  CheckoutSessionRequest,
  CheckoutSessionResult,
  SubscriptionCheckoutRequest,
  PortalSessionRequest,
  WebhookEvent,
} from "./types";

const NOT_IMPLEMENTED = (method: string) =>
  new Error(`StripeGateway.${method}() is not yet implemented. Wire @stripe/stripe-node in a focused PR.`);

export class StripeGateway implements PaymentGateway {
  async createCheckoutSession(_req: CheckoutSessionRequest): Promise<CheckoutSessionResult> {
    throw NOT_IMPLEMENTED("createCheckoutSession");
  }
  async verifyPayment(_sessionId: string) {
    throw NOT_IMPLEMENTED("verifyPayment");
  }
  async createSubscriptionCheckoutSession(_req: SubscriptionCheckoutRequest): Promise<CheckoutSessionResult> {
    throw NOT_IMPLEMENTED("createSubscriptionCheckoutSession");
  }
  async createPortalSession(_req: PortalSessionRequest): Promise<{ url: string }> {
    throw NOT_IMPLEMENTED("createPortalSession");
  }
  async pauseSubscription(_subscriptionId: string): Promise<void> {
    throw NOT_IMPLEMENTED("pauseSubscription");
  }
  async resumeSubscription(_subscriptionId: string): Promise<void> {
    throw NOT_IMPLEMENTED("resumeSubscription");
  }
  async parseWebhookEvent(_rawBody: string, _signature: string | null): Promise<WebhookEvent> {
    throw NOT_IMPLEMENTED("parseWebhookEvent");
  }
}
```

- [ ] **Step 4: Wire `getPaymentGateway` to return StripeGateway when `PAYMENT_GATEWAY=stripe`**

Open `src/lib/payment/gateway.ts` and update the `stripe` branch:

```ts
import type { PaymentGateway } from "@/lib/payment/types";
import { MockPaymentGateway } from "./mock-gateway";
import { StripeGateway } from "./stripe-gateway";

export function getPaymentGateway(): PaymentGateway {
  const provider = process.env.PAYMENT_GATEWAY ?? "mock";

  if (provider === "stripe") {
    return new StripeGateway();
  }

  if (provider === "mock" && process.env.NODE_ENV === "production") {
    throw new Error(
      "Mock payment gateway cannot be used in production. Set PAYMENT_GATEWAY=stripe and configure Stripe credentials."
    );
  }

  return new MockPaymentGateway();
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/lib/payment/`
Expected: PASS — all existing payment tests + 7 new StripeGateway stub tests.

- [ ] **Step 6: Commit**

```bash
git add src/lib/payment/stripe-gateway.ts src/lib/payment/__tests__/stripe-gateway.test.ts src/lib/payment/gateway.ts
git commit -m "feat(payment): StripeGateway stub + getPaymentGateway routes to it when PAYMENT_GATEWAY=stripe"
```

---

## Task 6: Webhook handler — `handleCheckoutCompleted`

**Files:**
- Create: `src/lib/payment/webhook-handler.ts`
- Create: `src/lib/payment/__tests__/webhook-handler.test.ts`

**Rationale:** Provisioning is the highest-leverage logic in the whole feature — webhook handler tests are pure functions over real Stripe event JSON. Pin behavior down hard before any API plumbing.

- [ ] **Step 1: Write the failing test**

Create `src/lib/payment/__tests__/webhook-handler.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleCheckoutCompleted } from "../webhook-handler";
import type { WebhookEvent } from "../types";

function makeCheckoutEvent(overrides: Partial<{ userId: string; subId: string; priceId: string; created: number }> = {}): WebhookEvent {
  const { userId = "user-1", subId = "sub_1", priceId = "mock_lite", created = 1717000000 } = overrides;
  return {
    type: "checkout.session.completed",
    created,
    data: {
      id: "cs_1",
      client_reference_id: userId,
      customer: "cus_1",
      subscription: subId,
      current_period_start: created,
      current_period_end: created + 30 * 24 * 60 * 60,
      line_items: [{ price: { id: priceId } }],
    },
  };
}

function makeSupabaseFake() {
  const memberships: Array<Record<string, unknown>> = [];
  const tiers = [
    { id: "tier-lite", slug: "lite", personal_hours_included: 5, virtual_tasks_included: 3 },
    { id: "tier-essential", slug: "essential", personal_hours_included: 15, virtual_tasks_included: 8 },
    { id: "tier-heavy", slug: "heavy", personal_hours_included: 30, virtual_tasks_included: 15 },
  ];
  const tierBySlug = (slug: string) => tiers.find((t) => t.slug === slug);
  const tierByPriceId = (priceId: string) => {
    const slug = priceId.replace(/^mock_/, "").replace(/^price_/, "");
    return tierBySlug(slug);
  };
  return {
    memberships,
    tiers,
    from(table: string) {
      if (table === "memberships") {
        return {
          select: () => ({
            eq: (col: string, val: unknown) => ({
              maybeSingle: async () => ({ data: memberships.find((m) => m[col] === val) ?? null, error: null }),
            }),
          }),
          insert: (row: Record<string, unknown>) => {
            memberships.push(row);
            return { select: () => ({ single: async () => ({ data: row, error: null }) }) };
          },
          update: (patch: Record<string, unknown>) => ({
            eq: (col: string, val: unknown) => {
              const target = memberships.find((m) => m[col] === val);
              if (target) Object.assign(target, patch);
              return { select: () => ({ single: async () => ({ data: target, error: null }) }) };
            },
          }),
        };
      }
      if (table === "membership_tiers") {
        return {
          select: () => ({
            eq: (col: string, val: unknown) => ({
              maybeSingle: async () => ({
                data: col === "slug" ? tierBySlug(val as string) : null,
                error: null,
              }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
    tierByPriceId,
  };
}

describe("handleCheckoutCompleted", () => {
  beforeEach(() => vi.useRealTimers());

  it("inserts a fresh membership row when none exists for the user", async () => {
    const db = makeSupabaseFake();
    await handleCheckoutCompleted(makeCheckoutEvent(), db as never);
    expect(db.memberships).toHaveLength(1);
    expect(db.memberships[0]).toMatchObject({
      user_id: "user-1",
      tier_id: "tier-lite",
      stripe_subscription_id: "sub_1",
      stripe_customer_id: "cus_1",
      status: "active",
      personal_hours_total: 5,
      virtual_tasks_total: 8 - 5,  // placeholder; actually 3 — see assertion below
    });
    expect(db.memberships[0].virtual_tasks_total).toBe(3);
  });

  it("is idempotent — replaying the same event leaves one row", async () => {
    const db = makeSupabaseFake();
    const event = makeCheckoutEvent();
    await handleCheckoutCompleted(event, db as never);
    await handleCheckoutCompleted(event, db as never);
    expect(db.memberships).toHaveLength(1);
  });

  it("updates an existing admin-created row (no stripe_subscription_id) instead of inserting", async () => {
    const db = makeSupabaseFake();
    db.memberships.push({
      user_id: "user-1",
      tier_id: "tier-essential",
      stripe_subscription_id: null,
      stripe_customer_id: null,
      status: "active",
      personal_hours_total: 15,
      personal_hours_used: 4,
      virtual_tasks_total: 8,
      virtual_tasks_used: 2,
    });
    await handleCheckoutCompleted(makeCheckoutEvent({ priceId: "mock_lite" }), db as never);
    expect(db.memberships).toHaveLength(1);
    expect(db.memberships[0]).toMatchObject({
      stripe_subscription_id: "sub_1",
      stripe_customer_id: "cus_1",
      tier_id: "tier-lite",
      personal_hours_total: 5,
      virtual_tasks_total: 3,
    });
  });
});
```

(Note: the `expect(db.memberships[0].virtual_tasks_total).toBe(3)` is the real assertion; the earlier `8 - 5` is intentional shape demonstration.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/payment/__tests__/webhook-handler.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the handler**

Create `src/lib/payment/webhook-handler.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { WebhookEvent, CheckoutSessionData } from "./types";

type DB = SupabaseClient;

function priceIdToSlug(priceId: string): string {
  return priceId.replace(/^mock_/, "").replace(/^price_/, "");
}

async function lookupTierByPriceId(db: DB, priceId: string) {
  const slug = priceIdToSlug(priceId);
  const { data } = await db.from("membership_tiers").select().eq("slug", slug).maybeSingle();
  return data as { id: string; personal_hours_included: number; virtual_tasks_included: number } | null;
}

function periodFromEvent(d: CheckoutSessionData) {
  return {
    billing_period_start: new Date(d.current_period_start * 1000).toISOString(),
    billing_period_end: new Date(d.current_period_end * 1000).toISOString(),
  };
}

export async function handleCheckoutCompleted(event: Extract<WebhookEvent, { type: "checkout.session.completed" }>, db: DB) {
  const d = event.data;
  if (!d.client_reference_id) return;
  const tier = await lookupTierByPriceId(db, d.line_items[0]?.price.id ?? "");
  if (!tier) return;
  const period = periodFromEvent(d);

  // Case 1: idempotent replay — row already exists with this stripe_subscription_id
  const { data: existingBySub } = await db
    .from("memberships")
    .select()
    .eq("stripe_subscription_id", d.subscription)
    .maybeSingle();
  if (existingBySub) return;

  // Case 2: existing admin-created row for this user (no stripe IDs) — attach
  const { data: existingByUser } = await db
    .from("memberships")
    .select()
    .eq("user_id", d.client_reference_id)
    .maybeSingle();

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
    ...period,
  };

  if (existingByUser) {
    await db.from("memberships").update(patch).eq("id", existingByUser.id);
    return;
  }

  // Case 3: fresh INSERT
  await db.from("memberships").insert({ user_id: d.client_reference_id, ...patch });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/payment/__tests__/webhook-handler.test.ts`
Expected: PASS — 3 tests for handleCheckoutCompleted.

- [ ] **Step 5: Commit**

```bash
git add src/lib/payment/webhook-handler.ts src/lib/payment/__tests__/webhook-handler.test.ts
git commit -m "feat(payment): webhook-handler handleCheckoutCompleted with idempotency + admin-overlap UPSERT"
```

---

## Task 7: Webhook handler — subscription updated/deleted

**Files:**
- Modify: `src/lib/payment/webhook-handler.ts`
- Modify: `src/lib/payment/__tests__/webhook-handler.test.ts`

- [ ] **Step 1: Write failing tests**

Append to `src/lib/payment/__tests__/webhook-handler.test.ts`:

```ts
import { handleSubscriptionUpdated, handleSubscriptionDeleted } from "../webhook-handler";
import type { SubscriptionData } from "../types";

function makeSubEvent(type: "customer.subscription.updated" | "customer.subscription.deleted", overrides: Partial<SubscriptionData & { created: number }> = {}): WebhookEvent {
  const { created = 1717000000, ...rest } = overrides;
  return {
    type,
    created,
    data: {
      id: "sub_1",
      customer: "cus_1",
      status: "active",
      cancel_at_period_end: false,
      current_period_start: created,
      current_period_end: created + 30 * 24 * 60 * 60,
      pause_collection: null,
      items: { data: [{ price: { id: "mock_lite" } }] },
      ...rest,
    },
  };
}

describe("handleSubscriptionUpdated", () => {
  it("updates cancel_at_period_end when Stripe sets it", async () => {
    const db = makeSupabaseFake();
    db.memberships.push({ id: "m1", user_id: "u1", stripe_subscription_id: "sub_1", status: "active", cancel_at_period_end: false, updated_at: new Date(0).toISOString() });
    await handleSubscriptionUpdated(makeSubEvent("customer.subscription.updated", { cancel_at_period_end: true }), db as never);
    expect(db.memberships[0]).toMatchObject({ cancel_at_period_end: true });
  });

  it("changes tier when price_id changes", async () => {
    const db = makeSupabaseFake();
    db.memberships.push({ id: "m1", user_id: "u1", stripe_subscription_id: "sub_1", tier_id: "tier-lite", status: "active", updated_at: new Date(0).toISOString() });
    await handleSubscriptionUpdated(makeSubEvent("customer.subscription.updated", { items: { data: [{ price: { id: "mock_essential" } }] } }), db as never);
    expect(db.memberships[0].tier_id).toBe("tier-essential");
  });

  it("sets status='past_due' when Stripe status flips to past_due", async () => {
    const db = makeSupabaseFake();
    db.memberships.push({ id: "m1", user_id: "u1", stripe_subscription_id: "sub_1", status: "active", updated_at: new Date(0).toISOString() });
    await handleSubscriptionUpdated(makeSubEvent("customer.subscription.updated", { status: "past_due" }), db as never);
    expect(db.memberships[0].status).toBe("past_due");
  });

  it("ignores stale events (event.created older than row's updated_at)", async () => {
    const db = makeSupabaseFake();
    const now = Math.floor(Date.now() / 1000);
    db.memberships.push({ id: "m1", user_id: "u1", stripe_subscription_id: "sub_1", status: "active", cancel_at_period_end: false, updated_at: new Date(now * 1000).toISOString() });
    await handleSubscriptionUpdated(makeSubEvent("customer.subscription.updated", { created: now - 100, cancel_at_period_end: true }), db as never);
    expect(db.memberships[0].cancel_at_period_end).toBe(false);
  });
});

describe("handleSubscriptionDeleted", () => {
  it("sets status='cancelled'", async () => {
    const db = makeSupabaseFake();
    db.memberships.push({ id: "m1", user_id: "u1", stripe_subscription_id: "sub_1", status: "active", updated_at: new Date(0).toISOString() });
    await handleSubscriptionDeleted(makeSubEvent("customer.subscription.deleted"), db as never);
    expect(db.memberships[0].status).toBe("cancelled");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/payment/__tests__/webhook-handler.test.ts`
Expected: FAIL — handleSubscriptionUpdated + handleSubscriptionDeleted not exported.

- [ ] **Step 3: Extend the handler**

Append to `src/lib/payment/webhook-handler.ts`:

```ts
import type { SubscriptionData } from "./types";

function statusFromStripe(s: SubscriptionData["status"]): "active" | "paused" | "cancelled" | "past_due" {
  if (s === "canceled") return "cancelled";
  if (s === "paused") return "paused";
  if (s === "past_due") return "past_due";
  return "active";
}

async function findRowBySub(db: DB, subscriptionId: string) {
  const { data } = await db.from("memberships").select().eq("stripe_subscription_id", subscriptionId).maybeSingle();
  return data as { id: string; updated_at: string; tier_id: string | null } | null;
}

export async function handleSubscriptionUpdated(event: Extract<WebhookEvent, { type: "customer.subscription.updated" }>, db: DB) {
  const d = event.data;
  const row = await findRowBySub(db, d.id);
  if (!row) return;

  // Stale-event guard
  if (new Date(row.updated_at).getTime() / 1000 > event.created) return;

  const newPriceId = d.items.data[0]?.price.id;
  const newTier = newPriceId ? await lookupTierByPriceId(db, newPriceId) : null;

  const patch: Record<string, unknown> = {
    status: statusFromStripe(d.status),
    cancel_at_period_end: d.cancel_at_period_end,
    billing_period_start: new Date(d.current_period_start * 1000).toISOString(),
    billing_period_end: new Date(d.current_period_end * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (newTier && newTier.id !== row.tier_id) {
    patch.tier_id = newTier.id;
    patch.personal_hours_total = newTier.personal_hours_included;
    patch.virtual_tasks_total = newTier.virtual_tasks_included;
  }
  await db.from("memberships").update(patch).eq("id", row.id);
}

export async function handleSubscriptionDeleted(event: Extract<WebhookEvent, { type: "customer.subscription.deleted" }>, db: DB) {
  const row = await findRowBySub(db, event.data.id);
  if (!row) return;
  await db.from("memberships").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", row.id);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/payment/__tests__/webhook-handler.test.ts`
Expected: PASS — all webhook-handler tests including the new 5.

- [ ] **Step 5: Commit**

```bash
git add src/lib/payment/webhook-handler.ts src/lib/payment/__tests__/webhook-handler.test.ts
git commit -m "feat(payment): webhook-handler handles subscription updated/deleted with stale-event guard"
```

---

## Task 8: Webhook handler — invoice paid / payment failed

**Files:**
- Modify: `src/lib/payment/webhook-handler.ts`
- Modify: `src/lib/payment/__tests__/webhook-handler.test.ts`

- [ ] **Step 1: Write failing tests**

Append to `src/lib/payment/__tests__/webhook-handler.test.ts`:

```ts
import { handleInvoicePaid, handleInvoicePaymentFailed } from "../webhook-handler";
import type { InvoiceData } from "../types";

function makeInvoiceEvent(type: "invoice.paid" | "invoice.payment_failed", overrides: Partial<InvoiceData & { created: number }> = {}): WebhookEvent {
  const { created = 1717000000, ...rest } = overrides;
  return {
    type,
    created,
    data: {
      id: "in_1",
      customer: "cus_1",
      subscription: "sub_1",
      period_start: created,
      period_end: created + 30 * 24 * 60 * 60,
      status: type === "invoice.paid" ? "paid" : "open",
      ...rest,
    },
  };
}

describe("handleInvoicePaid", () => {
  it("extends billing_period_end and resets usage counters", async () => {
    const db = makeSupabaseFake();
    db.memberships.push({ id: "m1", stripe_subscription_id: "sub_1", status: "active", personal_hours_used: 4, virtual_tasks_used: 2, billing_period_end: "2020-01-01T00:00:00.000Z", updated_at: new Date(0).toISOString() });
    await handleInvoicePaid(makeInvoiceEvent("invoice.paid"), db as never);
    expect(db.memberships[0]).toMatchObject({ personal_hours_used: 0, virtual_tasks_used: 0 });
    expect(db.memberships[0].billing_period_end).not.toBe("2020-01-01T00:00:00.000Z");
  });

  it("revives a past_due membership to active when payment succeeds", async () => {
    const db = makeSupabaseFake();
    db.memberships.push({ id: "m1", stripe_subscription_id: "sub_1", status: "past_due", personal_hours_used: 0, virtual_tasks_used: 0, billing_period_end: "2020-01-01T00:00:00.000Z", updated_at: new Date(0).toISOString() });
    await handleInvoicePaid(makeInvoiceEvent("invoice.paid"), db as never);
    expect(db.memberships[0].status).toBe("active");
  });
});

describe("handleInvoicePaymentFailed", () => {
  it("sets status='past_due'", async () => {
    const db = makeSupabaseFake();
    db.memberships.push({ id: "m1", stripe_subscription_id: "sub_1", status: "active", updated_at: new Date(0).toISOString() });
    await handleInvoicePaymentFailed(makeInvoiceEvent("invoice.payment_failed"), db as never);
    expect(db.memberships[0].status).toBe("past_due");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/payment/__tests__/webhook-handler.test.ts`
Expected: FAIL — handleInvoicePaid / handleInvoicePaymentFailed not exported.

- [ ] **Step 3: Extend the handler**

Append to `src/lib/payment/webhook-handler.ts`:

```ts
export async function handleInvoicePaid(event: Extract<WebhookEvent, { type: "invoice.paid" }>, db: DB) {
  const d = event.data;
  if (!d.subscription) return;
  const row = await findRowBySub(db, d.subscription);
  if (!row) return;
  await db.from("memberships").update({
    status: "active",
    billing_period_start: new Date(d.period_start * 1000).toISOString(),
    billing_period_end: new Date(d.period_end * 1000).toISOString(),
    personal_hours_used: 0,
    virtual_tasks_used: 0,
    updated_at: new Date().toISOString(),
  }).eq("id", row.id);
}

export async function handleInvoicePaymentFailed(event: Extract<WebhookEvent, { type: "invoice.payment_failed" }>, db: DB) {
  const d = event.data;
  if (!d.subscription) return;
  const row = await findRowBySub(db, d.subscription);
  if (!row) return;
  await db.from("memberships").update({ status: "past_due", updated_at: new Date().toISOString() }).eq("id", row.id);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/payment/__tests__/webhook-handler.test.ts`
Expected: PASS — all webhook-handler tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/payment/webhook-handler.ts src/lib/payment/__tests__/webhook-handler.test.ts
git commit -m "feat(payment): webhook-handler handles invoice.paid (UIOLO reset) + invoice.payment_failed (past_due)"
```

---

## Task 9: `/api/webhooks/stripe` route

**Files:**
- Create: `src/app/api/webhooks/stripe/route.ts`
- Create: `src/app/api/webhooks/stripe/__tests__/route.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/app/api/webhooks/stripe/__tests__/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockParse = vi.fn();
const mockHandlers = {
  handleCheckoutCompleted: vi.fn(),
  handleSubscriptionUpdated: vi.fn(),
  handleSubscriptionDeleted: vi.fn(),
  handleInvoicePaid: vi.fn(),
  handleInvoicePaymentFailed: vi.fn(),
};

vi.mock("@/lib/payment/gateway", () => ({
  getPaymentGateway: () => ({ parseWebhookEvent: mockParse }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: () => ({ from: vi.fn() }),
}));
vi.mock("@/lib/payment/webhook-handler", () => mockHandlers);

import { POST } from "../route";

function webhookRequest(body: string, headers: Record<string, string> = {}) {
  return new NextRequest("https://example.com/api/webhooks/stripe", {
    method: "POST",
    body,
    headers: { "content-type": "application/json", ...headers },
  });
}

describe("POST /api/webhooks/stripe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.PAYMENT_GATEWAY;
  });

  it("in mock mode, accepts an unsigned body with x-mock-signature header and dispatches", async () => {
    process.env.PAYMENT_GATEWAY = "mock";
    mockParse.mockResolvedValue({ type: "checkout.session.completed", created: 1, data: {} });
    const res = await POST(webhookRequest('{"type":"checkout.session.completed"}', { "x-mock-signature": "1" }));
    expect(res.status).toBe(200);
    expect(mockHandlers.handleCheckoutCompleted).toHaveBeenCalled();
  });

  it("in stripe mode, rejects requests missing stripe-signature with 400", async () => {
    process.env.PAYMENT_GATEWAY = "stripe";
    const res = await POST(webhookRequest('{"type":"checkout.session.completed"}'));
    expect(res.status).toBe(400);
    expect(mockParse).not.toHaveBeenCalled();
  });

  it("returns 200 for unhandled event types without calling any handler", async () => {
    process.env.PAYMENT_GATEWAY = "mock";
    mockParse.mockResolvedValue({ type: "unhandled", created: 1, rawType: "customer.created" });
    const res = await POST(webhookRequest('{"type":"customer.created"}', { "x-mock-signature": "1" }));
    expect(res.status).toBe(200);
    expect(mockHandlers.handleCheckoutCompleted).not.toHaveBeenCalled();
  });

  it("returns 400 when gateway.parseWebhookEvent throws (invalid sig)", async () => {
    process.env.PAYMENT_GATEWAY = "mock";
    mockParse.mockRejectedValue(new Error("invalid signature"));
    const res = await POST(webhookRequest('{}', { "x-mock-signature": "1" }));
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/app/api/webhooks/stripe/__tests__/route.test.ts`
Expected: FAIL — route module not found.

- [ ] **Step 3: Write the route**

Create `src/app/api/webhooks/stripe/route.ts`:

```ts
import { NextResponse, type NextRequest } from "next/server";
import { getPaymentGateway } from "@/lib/payment/gateway";
import { createServiceClient } from "@/lib/supabase/server";
import {
  handleCheckoutCompleted,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handleInvoicePaid,
  handleInvoicePaymentFailed,
} from "@/lib/payment/webhook-handler";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const stripeSig = request.headers.get("stripe-signature");
  const mockSig = request.headers.get("x-mock-signature");
  const provider = process.env.PAYMENT_GATEWAY ?? "mock";

  // Signature gate
  if (provider === "stripe" && !stripeSig) {
    return NextResponse.json({ error: "missing stripe-signature" }, { status: 400 });
  }
  if (provider === "mock" && !mockSig && !stripeSig) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }

  let event;
  try {
    event = await getPaymentGateway().parseWebhookEvent(rawBody, stripeSig);
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  const db = createServiceClient();

  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event, db);
      break;
    case "customer.subscription.updated":
      await handleSubscriptionUpdated(event, db);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event, db);
      break;
    case "invoice.paid":
      await handleInvoicePaid(event, db);
      break;
    case "invoice.payment_failed":
      await handleInvoicePaymentFailed(event, db);
      break;
    case "unhandled":
      // acknowledged but no-op — keeps Stripe from retrying
      break;
  }

  return NextResponse.json({ received: true });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/app/api/webhooks/stripe/__tests__/route.test.ts`
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/webhooks/stripe/route.ts src/app/api/webhooks/stripe/__tests__/route.test.ts
git commit -m "feat(payment): /api/webhooks/stripe with signature gating + handler dispatch"
```

---

## Task 10: `/api/membership/checkout` route

**Files:**
- Create: `src/app/api/membership/checkout/route.ts`
- Create: `src/app/api/membership/checkout/__tests__/route.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/app/api/membership/checkout/__tests__/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockCreateSub = vi.fn();
const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));
vi.mock("@/lib/payment/gateway", () => ({
  getPaymentGateway: () => ({ createSubscriptionCheckoutSession: mockCreateSub }),
}));

import { POST } from "../route";

function req(body: unknown) {
  return new NextRequest("https://staging.butlersinc.com/api/membership/checkout", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/membership/checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "u1@example.com" } } });
    mockCreateSub.mockResolvedValue({ url: "https://stripe.test/checkout/sess_1", sessionId: "sess_1" });
  });

  it("returns 401 when no auth session", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(req({ tier: "lite" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for an invalid tier slug", async () => {
    const res = await POST(req({ tier: "ultra" }));
    expect(res.status).toBe(400);
    expect(mockCreateSub).not.toHaveBeenCalled();
  });

  it("calls gateway with tier + priceId + userId + origin-derived URLs and returns the gateway URL", async () => {
    const res = await POST(req({ tier: "essential" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ url: "https://stripe.test/checkout/sess_1" });
    expect(mockCreateSub).toHaveBeenCalledWith(expect.objectContaining({
      tier: "essential",
      priceId: "mock_essential",
      userId: "u1",
      customerEmail: "u1@example.com",
      successUrl: "https://staging.butlersinc.com/members/checkout/success?session_id={CHECKOUT_SESSION_ID}",
      cancelUrl: "https://staging.butlersinc.com/membership",
    }));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/app/api/membership/checkout/__tests__/route.test.ts`
Expected: FAIL — route not found.

- [ ] **Step 3: Write the route**

Create `src/app/api/membership/checkout/route.ts`:

```ts
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getPaymentGateway } from "@/lib/payment/gateway";
import { getTierPriceId } from "@/lib/membership/tier-pricing";
import { getSiteUrl } from "@/lib/site-url";

const schema = z.object({ tier: z.enum(["lite", "essential", "heavy"]) });

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid tier" }, { status: 400 });

  const origin = getSiteUrl(request);
  const session = await getPaymentGateway().createSubscriptionCheckoutSession({
    tier: parsed.data.tier,
    priceId: getTierPriceId(parsed.data.tier),
    userId: user.id,
    customerEmail: user.email!,
    successUrl: `${origin}/members/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${origin}/membership`,
  });

  return NextResponse.json({ url: session.url });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/app/api/membership/checkout/__tests__/route.test.ts`
Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/membership/checkout/route.ts src/app/api/membership/checkout/__tests__/route.test.ts
git commit -m "feat(membership): /api/membership/checkout creates subscription session"
```

---

## Task 11: `/membership/checkout/[tier]` page (server component)

**Files:**
- Create: `src/app/membership/checkout/[tier]/page.tsx`

**Rationale:** Thin server component. Calls the API route internally, 307s to the returned gateway URL. No tests needed at the page level — covered by the API route tests.

- [ ] **Step 1: Write the page**

Create `src/app/membership/checkout/[tier]/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPaymentGateway } from "@/lib/payment/gateway";
import { getTierPriceId } from "@/lib/membership/tier-pricing";
import { getSiteUrl } from "@/lib/site-url";
import { headers } from "next/headers";

type Params = Promise<{ tier: string }>;

export default async function CheckoutPage({ params }: { params: Params }) {
  const { tier } = await params;
  if (!["lite", "essential", "heavy"].includes(tier)) redirect("/membership");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/members/signup?next=${encodeURIComponent(`/membership/checkout/${tier}`)}`);
  }

  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("host") ?? "";
  const origin = getSiteUrl({ url: `${proto}://${host}/membership/checkout/${tier}` });

  const session = await getPaymentGateway().createSubscriptionCheckoutSession({
    tier: tier as "lite" | "essential" | "heavy",
    priceId: getTierPriceId(tier as "lite" | "essential" | "heavy"),
    userId: user!.id,
    customerEmail: user!.email!,
    successUrl: `${origin}/members/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${origin}/membership`,
  });

  redirect(session.url);
}
```

- [ ] **Step 2: Smoke check**

Run: `npm run test:run`
Expected: PASS — no new tests, but ensure nothing existing breaks.

- [ ] **Step 3: Commit**

```bash
git add src/app/membership/checkout/[tier]/page.tsx
git commit -m "feat(membership): /membership/checkout/[tier] server page creates session + redirects"
```

---

## Task 12: Extend `/payment/simulate` for `?type=subscription`

**Files:**
- Modify: `src/app/payment/simulate/page.tsx` (read existing first)

- [ ] **Step 1: Read the existing simulate page**

Run: `cat src/app/payment/simulate/page.tsx`
Note the existing one-off payment shape — we'll add a parallel subscription branch.

- [ ] **Step 2: Add subscription branch**

In `src/app/payment/simulate/page.tsx`, wrap the existing UI in a conditional based on `searchParams.type`. When `type === "subscription"`, render a subscription approval UI with a single "Approve subscription (£XX/mo for Tier)" button. On click, POST a synthetic `checkout.session.completed` event to `/api/webhooks/stripe` with `x-mock-signature: 1`, then redirect to `success_url` (with `{CHECKOUT_SESSION_ID}` replaced by `session_id` from the URL).

Pseudocode for the new branch (write as a client component sub-file or inline):

```tsx
'use client';
function SubscriptionApproval({ tier, sessionId, userId, priceId, successUrl, cancelUrl }: {...}) {
  const approve = async () => {
    const now = Math.floor(Date.now() / 1000);
    await fetch("/api/webhooks/stripe", {
      method: "POST",
      headers: { "content-type": "application/json", "x-mock-signature": "1" },
      body: JSON.stringify({
        type: "checkout.session.completed",
        created: now,
        data: {
          id: sessionId,
          client_reference_id: userId,
          customer: `mock_cus_${userId}`,
          subscription: `mock_sub_${userId}_${now}`,
          current_period_start: now,
          current_period_end: now + 30 * 24 * 60 * 60,
          line_items: [{ price: { id: priceId } }],
        },
      }),
    });
    window.location.href = successUrl.replace("{CHECKOUT_SESSION_ID}", sessionId);
  };
  const cancel = () => { window.location.href = cancelUrl; };
  return (
    <div>
      <h1>Approve {tier} subscription</h1>
      <button onClick={approve}>Approve</button>
      <button onClick={cancel}>Cancel</button>
    </div>
  );
}
```

Add brand-faithful styling matching the existing simulator page.

- [ ] **Step 3: Manual smoke**

Run `npm run dev` and visit `/payment/simulate?type=subscription&session_id=test&tier=lite&price_id=mock_lite&user_id=USER_ID&email=test@example.com&success_url=http://localhost:3000/members/checkout/success?session_id={CHECKOUT_SESSION_ID}&cancel_url=http://localhost:3000/membership` (use a real user ID from your Supabase auth users). Click Approve — should hit the webhook then redirect to the success URL.

- [ ] **Step 4: Commit**

```bash
git add src/app/payment/simulate/page.tsx
git commit -m "feat(payment): simulate page handles ?type=subscription with synthetic webhook"
```

---

## Task 13: `TierCard` + `TierComparison` components

**Files:**
- Create: `src/components/membership/TierCard.tsx`
- Create: `src/components/membership/TierComparison.tsx`
- Create: `src/components/membership/__tests__/TierCard.test.tsx`
- Create: `src/components/membership/__tests__/TierComparison.test.tsx`

- [ ] **Step 1: Write the failing TierCard test**

Create `src/components/membership/__tests__/TierCard.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@/test/test-utils";
import { TierCard } from "../TierCard";
import { MEMBERSHIP_TIERS } from "@/data/membership-config";

const lite = MEMBERSHIP_TIERS.find((t) => t.slug === "lite")!;

describe("TierCard", () => {
  it("renders tier name, price, hours, tasks", () => {
    render(<TierCard tier={lite} />);
    expect(screen.getByText("Lite")).toBeInTheDocument();
    expect(screen.getByText(/£49/)).toBeInTheDocument();
    expect(screen.getByText(/5 personal butler hours/i)).toBeInTheDocument();
    expect(screen.getByText(/3 virtual tasks/i)).toBeInTheDocument();
  });

  it("renders a CTA link to /membership/checkout/[slug]", () => {
    render(<TierCard tier={lite} />);
    const link = screen.getByRole("link", { name: /choose lite/i });
    expect(link).toHaveAttribute("href", "/membership/checkout/lite");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/membership/__tests__/TierCard.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write TierCard**

Create `src/components/membership/TierCard.tsx`:

```tsx
import Link from "next/link";
import type { MembershipTier } from "@/types/membership";

interface Props { tier: MembershipTier; }

export function TierCard({ tier }: Props) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-sm p-7 flex flex-col gap-3">
      <h3 className="font-serif text-2xl font-semibold text-optical-white">{tier.name}</h3>
      <p className="text-sm text-warm-gray min-h-7">{tier.description}</p>
      <div className="font-serif text-4xl font-semibold text-optical-white">
        £{tier.monthlyPrice}<span className="text-sm text-warm-gray font-normal">/month</span>
      </div>
      <ul className="list-none p-0 my-2 text-sm space-y-1.5 text-optical-white/85">
        <li><span className="text-brass">·</span> {tier.personalHoursIncluded} personal butler hours</li>
        <li><span className="text-brass">·</span> {tier.virtualTasksIncluded} virtual tasks</li>
        <li><span className="text-brass">·</span> Flat £50/hr, no surcharges</li>
      </ul>
      <Link
        href={`/membership/checkout/${tier.slug}`}
        className="bg-brass text-charcoal py-2.5 px-4 text-center rounded-sm font-semibold text-sm mt-auto hover:bg-brass-muted transition-colors"
      >
        Choose {tier.name}
      </Link>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/membership/__tests__/TierCard.test.tsx`
Expected: PASS — 2 tests.

- [ ] **Step 5: Write the failing TierComparison test**

Create `src/components/membership/__tests__/TierComparison.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@/test/test-utils";
import { TierComparison } from "../TierComparison";

describe("TierComparison", () => {
  it("renders all three active tiers", () => {
    render(<TierComparison />);
    expect(screen.getByText("Lite")).toBeInTheDocument();
    expect(screen.getByText("Essential")).toBeInTheDocument();
    expect(screen.getByText("Heavy")).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run src/components/membership/__tests__/TierComparison.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 7: Write TierComparison**

Create `src/components/membership/TierComparison.tsx`:

```tsx
import { MEMBERSHIP_TIERS } from "@/data/membership-config";
import { TierCard } from "./TierCard";

export function TierComparison() {
  const tiers = MEMBERSHIP_TIERS.filter((t) => t.isActive).sort((a, b) => a.displayOrder - b.displayOrder);
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {tiers.map((tier) => <TierCard key={tier.id} tier={tier} />)}
    </div>
  );
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run src/components/membership/__tests__/TierComparison.test.tsx`
Expected: PASS — 1 test.

- [ ] **Step 9: Commit**

```bash
git add src/components/membership/TierCard.tsx src/components/membership/TierComparison.tsx src/components/membership/__tests__
git commit -m "feat(membership): TierCard + TierComparison components"
```

---

## Task 14: `/membership` public pricing page

**Files:**
- Create: `src/app/membership/page.tsx`
- Create: `src/app/membership/__tests__/page.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/app/membership/__tests__/page.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@/test/test-utils";
import MembershipPage from "../page";

describe("/membership", () => {
  it("renders heading + intro + all 3 tier names + footer reassurance", () => {
    render(<MembershipPage />);
    expect(screen.getByRole("heading", { name: /become a member/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/flat £50\/hr rate/i)).toBeInTheDocument();
    expect(screen.getByText("Lite")).toBeInTheDocument();
    expect(screen.getByText("Essential")).toBeInTheDocument();
    expect(screen.getByText("Heavy")).toBeInTheDocument();
    expect(screen.getByText(/cancel, upgrade, or pause anytime/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/membership/__tests__/page.test.tsx`
Expected: FAIL — page not found.

- [ ] **Step 3: Write the page**

Create `src/app/membership/page.tsx`:

```tsx
import type { Metadata } from "next";
import { TierComparison } from "@/components/membership/TierComparison";

export const metadata: Metadata = {
  title: "Become a member | Butlers Inc.",
  description: "Membership unlocks the flat £50/hr rate — same whether you book in three weeks or three hours.",
};

export default function MembershipPage() {
  return (
    <div className="min-h-screen bg-charcoal py-14 px-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="font-serif text-5xl font-semibold text-optical-white text-center tracking-tight mb-3">
          Become a member
        </h1>
        <p className="font-serif italic text-lg text-optical-white/85 text-center max-w-2xl mx-auto leading-relaxed mb-5">
          Membership unlocks the flat £50/hr rate — the same whether you book in three weeks or three hours — and a monthly allowance of butler hours and virtual tasks.
        </p>
        <div className="flex justify-center gap-7 text-sm text-warm-gray mb-9">
          <div><span className="text-brass">·</span> Same rate, every booking</div>
          <div><span className="text-brass">·</span> No urgency surcharges</div>
          <div><span className="text-brass">·</span> Hours reset monthly</div>
        </div>
        <TierComparison />
        <p className="text-center text-warm-gray/70 text-xs mt-8">
          Cancel, upgrade, or pause anytime.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/app/membership/__tests__/page.test.tsx`
Expected: PASS — 1 test.

- [ ] **Step 5: Commit**

```bash
git add src/app/membership/page.tsx src/app/membership/__tests__/page.test.tsx
git commit -m "feat(membership): public /membership pricing page"
```

---

## Task 15: `/members/checkout/success` + `CheckoutActivating` polling

**Files:**
- Create: `src/app/members/checkout/success/page.tsx`
- Create: `src/app/members/checkout/success/CheckoutActivating.tsx`
- Create: `src/app/members/checkout/success/__tests__/CheckoutActivating.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/app/members/checkout/success/__tests__/CheckoutActivating.test.tsx`:

```tsx
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, act } from "@/test/test-utils";
import { CheckoutActivating } from "../CheckoutActivating";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }));

describe("CheckoutActivating", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("polls /api/members/me until status === 'active' and then routes to dashboard", async () => {
    let calls = 0;
    global.fetch = vi.fn(async () => {
      calls++;
      const body = calls < 3 ? { membership: null } : { membership: { status: "active" } };
      return { ok: true, json: async () => body } as Response;
    });

    render(<CheckoutActivating />);
    await act(async () => { await vi.advanceTimersByTimeAsync(2400); });
    expect(mockPush).toHaveBeenCalledWith("/members/dashboard?welcome=1");
  });

  it("renders fallback after 10s without an active membership", async () => {
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ membership: null }) } as Response));
    render(<CheckoutActivating />);
    await act(async () => { await vi.advanceTimersByTimeAsync(10100); });
    expect(screen.getByText(/taking longer than usual/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /go to dashboard/i })).toHaveAttribute("href", "/members/dashboard");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/members/checkout/success/__tests__/CheckoutActivating.test.tsx`
Expected: FAIL — component not found.

- [ ] **Step 3: Write the components**

Create `src/app/members/checkout/success/CheckoutActivating.tsx`:

```tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const POLL_INTERVAL_MS = 800;
const MAX_DURATION_MS = 10_000;

export function CheckoutActivating() {
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const start = Date.now();
    const tick = async () => {
      try {
        const res = await fetch("/api/members/me");
        if (res.ok) {
          const body = await res.json();
          if (body?.membership?.status === "active") {
            router.push("/members/dashboard?welcome=1");
            return;
          }
        }
      } catch { /* swallow — keep polling */ }

      if (Date.now() - start >= MAX_DURATION_MS) {
        setTimedOut(true);
        return;
      }
      window.setTimeout(tick, POLL_INTERVAL_MS);
    };
    tick();
  }, [router]);

  if (timedOut) {
    return (
      <div className="text-center">
        <p className="text-optical-white text-lg mb-2">Taking longer than usual — your membership should appear shortly.</p>
        <Link href="/members/dashboard" className="text-brass-text underline">Go to dashboard</Link>
      </div>
    );
  }
  return (
    <div className="text-center">
      <p className="text-optical-white text-lg">Activating your membership…</p>
    </div>
  );
}
```

Create `src/app/members/checkout/success/page.tsx`:

```tsx
import type { Metadata } from "next";
import { CheckoutActivating } from "./CheckoutActivating";

export const metadata: Metadata = { title: "Activating membership" };

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-charcoal flex items-center justify-center px-6">
      <CheckoutActivating />
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/app/members/checkout/success/__tests__/CheckoutActivating.test.tsx`
Expected: PASS — 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/app/members/checkout/success/
git commit -m "feat(membership): /members/checkout/success polls for activation + timeout fallback"
```

---

## Task 16: Update Header "Join" + signup `?next=` honoring

**Files:**
- Modify: `src/components/landing/Header.tsx`
- Modify: `src/app/members/signup/SignupPage.tsx`

- [ ] **Step 1: Add a failing test for Header**

Create or extend `src/components/landing/__tests__/Header.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@/test/test-utils";
import { Header } from "../Header";

describe("Header", () => {
  it("Join CTA links to /membership (not /members/signup)", () => {
    render(<Header />);
    const join = screen.getAllByRole("link", { name: /^join$/i })[0];
    expect(join).toHaveAttribute("href", "/membership");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/landing/__tests__/Header.test.tsx`
Expected: FAIL — current href is `/members/signup`.

- [ ] **Step 3: Update Header**

In `src/components/landing/Header.tsx`, change both occurrences (desktop + mobile menu) of:

```tsx
href="/members/signup"
```

to:

```tsx
href="/membership"
```

— for the "Join" links specifically (leave "Sign In" → `/members/login` untouched).

- [ ] **Step 4: Run Header test**

Run: `npx vitest run src/components/landing/__tests__/Header.test.tsx`
Expected: PASS.

- [ ] **Step 5: Add a failing test for SignupPage `?next=` honoring**

In `src/app/members/__tests__/signup.test.tsx` (create if not present), add:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@/test/test-utils";
import { SignupPage } from "../signup/SignupPage";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams("?next=/membership/checkout/lite"),
}));

describe("SignupPage", () => {
  it("redirects to ?next= after successful signup", async () => {
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ ok: true }) } as Response));
    render(<SignupPage />);
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "Jane" } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "jane@example.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "supersecret" } });
    fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: "07123456789" } });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/membership/checkout/lite"));
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run src/app/members/__tests__/signup.test.tsx`
Expected: FAIL — page currently redirects to `/members/login`.

- [ ] **Step 7: Update SignupPage**

In `src/app/members/signup/SignupPage.tsx`, import `useSearchParams` and change the post-success redirect:

```tsx
import { useRouter, useSearchParams } from "next/navigation";

// inside the component:
const router = useRouter();
const params = useSearchParams();
const next = params.get("next");

// in onSubmit success branch:
toast.success("Account created! Please check your email to verify.");
router.push(next ?? "/members/login");
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npx vitest run src/app/members/__tests__/signup.test.tsx src/components/landing/__tests__/Header.test.tsx`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/components/landing/Header.tsx src/components/landing/__tests__/Header.test.tsx src/app/members/signup/SignupPage.tsx src/app/members/__tests__/signup.test.tsx
git commit -m "feat(membership): Header Join → /membership; signup honours ?next= after success"
```

---

## Task 17: Hero CTA + dashboard "Choose a plan" upsell

**Files:**
- Modify: `src/app/page.tsx` (read first, decide whether to add or rename)
- Modify: `src/app/members/dashboard/page.tsx`

- [ ] **Step 1: Read existing hero**

Run: `cat src/app/page.tsx`
If a hero CTA exists pointing at `/butlers` or `/members/signup`, add a sibling "Become a member" CTA pointing to `/membership`. If there's no CTA, add one in the hero area styled to match the brand.

- [ ] **Step 2: Update hero**

Add a Link with `href="/membership"` and brass styling in the hero section. Match existing visual patterns from `src/components/landing/`.

- [ ] **Step 3: Add failing test for dashboard "Choose a plan" upsell**

Add a test in `src/app/members/__tests__/dashboard.test.tsx` (create if absent):

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@/test/test-utils";

vi.mock("@/hooks/useMembership", () => ({ useMembership: () => ({ data: { membership: null }, isLoading: false }) }));
vi.mock("@/context/AuthContext", () => ({ useAuth: () => ({ user: { email: "u@x.com" }, loading: false }) }));

import DashboardPage from "../dashboard/page";

describe("Dashboard — no membership", () => {
  it("shows a 'Choose a plan' card linking to /membership", async () => {
    render(<DashboardPage />);
    await waitFor(() => expect(screen.getByText(/choose a plan/i)).toBeInTheDocument());
    expect(screen.getByRole("link", { name: /see plans/i })).toHaveAttribute("href", "/membership");
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npx vitest run src/app/members/__tests__/dashboard.test.tsx`
Expected: FAIL — text not present.

- [ ] **Step 5: Update dashboard**

In `src/app/members/dashboard/page.tsx`, when `membership` is null after loading, render a card before the empty state:

```tsx
{!membership && !isLoading && (
  <div className="bg-white/5 border border-brass/30 rounded-sm p-6 text-center">
    <h2 className="font-serif text-2xl text-optical-white mb-2">Choose a plan</h2>
    <p className="text-warm-gray text-sm mb-4">Unlock the flat £50/hr rate and a monthly allowance of butler hours.</p>
    <Link href="/membership" className="inline-block bg-brass text-charcoal px-5 py-2.5 rounded-sm font-semibold text-sm">See plans</Link>
  </div>
)}
```

(Adapt to the existing dashboard layout — wrap in the right container if needed.)

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/app/members/__tests__/dashboard.test.tsx`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app/page.tsx src/app/members/dashboard/page.tsx src/app/members/__tests__/dashboard.test.tsx
git commit -m "feat(membership): hero 'Become a member' CTA + dashboard 'Choose a plan' upsell when no membership"
```

---

## Task 18: Touch up existing tests for `past_due` status

**Files:**
- Modify: `src/hooks/__tests__/useMembership.test.tsx`
- Modify: `src/lib/membership/__tests__/membership-reader.test.ts`
- Modify: `src/lib/membership/__tests__/member-hours.test.ts`

- [ ] **Step 1: Add `past_due` cases**

In each of the three test files, add at least one test that exercises `status: 'past_due'`:

- `useMembership`: returns membership with status 'past_due' → consumer can still read tier info but `hasActiveMembership()` (if such a helper exists, or the equivalent inline check) returns false.
- `membership-reader`: a row with `status='past_due'` is returned by the reader (not filtered out).
- `member-hours`: `hasSufficientMemberHours()` returns `false` when `status === 'past_due'` (member loses member pricing while past due — same as paused).

- [ ] **Step 2: Run the full suite**

Run: `npm run test:run`
Expected: PASS — all green, including the new past_due cases. If any existing tests now fail because their fixtures don't cover `past_due`, fix them.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/__tests__/useMembership.test.tsx src/lib/membership/__tests__/membership-reader.test.ts src/lib/membership/__tests__/member-hours.test.ts
git commit -m "test(membership): cover past_due status across useMembership/reader/member-hours"
```

---

## Task 19: Apply migration locally + run final verification

- [ ] **Step 1: Apply the new migration locally**

If the project has a Supabase CLI workflow:

```bash
npx supabase db reset --local   # or whatever pattern the team uses
# OR manually run the SQL in the local Supabase studio
```

If not, push the migration through whatever process the team uses (often a manual paste in Supabase dashboard for the staging project before merging). Document what you did at the top of the PR.

- [ ] **Step 2: Run full test suite + lint**

Run: `npm run test:run && npm run lint`
Expected: ~430-440 tests passing, 0 fail. Lint: 5 errors / 12 warnings unchanged (all pre-existing).

- [ ] **Step 3: Manual smoke walk**

Start dev server: `npm run dev`

1. Open `http://localhost:3000` → verify "Become a member" CTA in hero → click → land on `/membership`.
2. On `/membership` see all 3 tier cards + intro paragraph + footer reassurance.
3. Click "Choose Lite" while signed-out → redirected to `/members/signup?next=/membership/checkout/lite`.
4. Sign up a fresh test account → after success, get redirected to `/membership/checkout/lite`.
5. (Email confirm flow — already wired by PR #19 — click the link, land on `/auth/callback` then `/members/dashboard`.)
6. Visit `/membership` again signed-in → "Choose Lite" → redirected to `/payment/simulate?type=subscription&…`.
7. Click "Approve" on the simulator → webhook fires → land on `/members/checkout/success?session_id=…` → spinner polls → redirects to `/members/dashboard?welcome=1` with active Lite membership + 5h + 3 tasks.
8. Refresh dashboard, verify membership persists.
9. Sign out, sign in, verify membership still active.
10. **Idempotency check:** open the network tab, replay the same POST to `/api/webhooks/stripe` → 200, no duplicate row in Supabase studio.

- [ ] **Step 4: Push branch + open PR**

```bash
git push -u origin feat--member-self-signup
gh pr create --base staging --head feat--member-self-signup \
  --title "feat(membership): public /membership + Stripe-shaped subscribe flow (Phase A)" \
  --body "$(cat <<'EOF'
## Summary
- Public /membership page with 3 tier cards (Lite/Essential/Heavy)
- Stripe-shaped subscription Checkout against existing PaymentGateway interface; mock today, real Stripe later (StripeGateway ships as a tested stub)
- Provisioning happens in /api/webhooks/stripe (5 event types: checkout.session.completed, customer.subscription.updated/.deleted, invoice.paid/.payment_failed) — success URL just polls
- /membership/checkout/[tier] server component, /members/checkout/success polling page, Header Join → /membership, signup ?next= honouring, dashboard "Choose a plan" upsell
- DB migration: stripe_customer_id, stripe_subscription_id, cancel_at_period_end, paused_at columns + past_due status

## Test plan
- [x] npm run test:run — ~430 passing, 0 fail
- [x] npm run lint — zero new errors/warnings
- [ ] Manual smoke walk on staging Vercel preview (steps in plan task 19.3)
- [ ] Webhook idempotency check (replay event, no duplicate row)

## What's next
- Phase B (self-serve: cancel, upgrade/downgrade, pause via Customer Portal + custom pause UI) — separate plan + PR

## Notes
- Migration 007_membership_subscriptions.sql must be applied to the staging Supabase project before merging
- PAYMENT_GATEWAY env stays 'mock' on staging until real Stripe is wired

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-review checklist (run after completing the plan)

- [ ] Spec coverage: every section of `2026-05-24-member-self-signup-design.md` Phase-A scope is covered by a task above. (Phase B items — `PlanManager`, `/api/membership/portal`, `/api/membership/pause`, simulate-portal — are explicitly out of scope.)
- [ ] Placeholder scan: no TBD/TODO/"fill in". Each step has runnable code.
- [ ] Type consistency: `WebhookEvent` discriminated union shape matches across types.ts, mock-gateway.ts, webhook-handler.ts, route.ts.
- [ ] DRY: webhook handler functions are reused by the route; tier resolution lives only in `tier-pricing.ts`.
- [ ] TDD: every task has a failing test before implementation, then passing test after.
- [ ] Frequent commits: 19 tasks → 19 commits, each producing a coherent green-tests slice.
