# Phase B — Self-Serve Plan Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship self-serve membership management on top of Phase A's funnel + provisioning: pause/resume, cancel/plan-swap/update-card via Stripe Customer Portal, dev-only mock portal simulator, and a `PlanManager` panel on `/members/settings` covering 7 view variants.

**Architecture:** Two new API routes (`/api/membership/portal`, `/api/membership/pause`), one new component (`PlanManager`), one dev page (`/payment/simulate-portal`), a shared `requireGatewayConfigured()` helper, plus surgical changes to `readActiveMembership` to (a) widen status filter so paused/cancelled rows are visible, and (b) skip lazy rollover for Stripe-managed memberships so pause preserves remaining hours. The `MockPaymentGateway` already exposes the right interface; no contract changes.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4, Supabase (auth + DB), Vitest, zod, react-hook-form, @tanstack/react-query. Mock payment gateway (Stripe wiring is a follow-up PR).

**Prerequisite:** A separate, focused PR renames tiers `essential → frequent`, `heavy → pro` and reprices to `£500 / £1000 / £2500`. This plan assumes that PR has landed; every tier reference uses the new slugs/names. If the prereq has not landed, **stop and ship it first**.

**Branch:** `feat--phase-b-self-serve` off `staging`. Never merged to `main`.

---

### Task 1: Shared `requireGatewayConfigured()` helper

**Files:**
- Create: `src/lib/payment/require-gateway-configured.ts`
- Create: `src/lib/payment/__tests__/require-gateway-configured.test.ts`

- [ ] **Step 1: Branch off staging**

```bash
git checkout staging
git pull
git checkout -b feat--phase-b-self-serve
```

- [ ] **Step 2: Write the failing test**

Create `src/lib/payment/__tests__/require-gateway-configured.test.ts`:

```ts
import { afterEach, describe, expect, it } from "vitest";
import { NextResponse } from "next/server";
import { requireGatewayConfigured } from "../require-gateway-configured";

const originalEnv = process.env.PAYMENT_GATEWAY;

describe("requireGatewayConfigured", () => {
  afterEach(() => {
    if (originalEnv === undefined) delete process.env.PAYMENT_GATEWAY;
    else process.env.PAYMENT_GATEWAY = originalEnv;
  });

  it("returns ok=true when PAYMENT_GATEWAY=mock", () => {
    process.env.PAYMENT_GATEWAY = "mock";
    const result = requireGatewayConfigured();
    expect(result.ok).toBe(true);
  });

  it("returns ok=true when PAYMENT_GATEWAY=stripe", () => {
    process.env.PAYMENT_GATEWAY = "stripe";
    const result = requireGatewayConfigured();
    expect(result.ok).toBe(true);
  });

  it("returns a 500 NextResponse when PAYMENT_GATEWAY is unset", async () => {
    delete process.env.PAYMENT_GATEWAY;
    const result = requireGatewayConfigured();
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response).toBeInstanceOf(NextResponse);
    expect(result.response.status).toBe(500);
    const body = await result.response.json();
    expect(body).toEqual({ error: { code: "gateway_unconfigured", message: "Payment gateway not configured" } });
  });

  it("returns a 500 NextResponse for unknown PAYMENT_GATEWAY values", () => {
    process.env.PAYMENT_GATEWAY = "paypal";
    const result = requireGatewayConfigured();
    expect(result.ok).toBe(false);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test:run -- src/lib/payment/__tests__/require-gateway-configured.test.ts`
Expected: FAIL with "Cannot find module '../require-gateway-configured'".

- [ ] **Step 4: Write the helper**

Create `src/lib/payment/require-gateway-configured.ts`:

```ts
import { NextResponse } from "next/server";

/**
 * Production-safety guard for API routes that call the payment gateway.
 *
 * Returns `{ ok: true }` when `PAYMENT_GATEWAY` is "mock" or "stripe".
 * Returns `{ ok: false, response }` with a 500 JSON envelope otherwise
 * — caller should `return result.response` immediately.
 */
export function requireGatewayConfigured():
  | { ok: true }
  | { ok: false; response: NextResponse } {
  const provider = process.env.PAYMENT_GATEWAY;
  if (provider === "mock" || provider === "stripe") return { ok: true };
  return {
    ok: false,
    response: NextResponse.json(
      { error: { code: "gateway_unconfigured", message: "Payment gateway not configured" } },
      { status: 500 }
    ),
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test:run -- src/lib/payment/__tests__/require-gateway-configured.test.ts`
Expected: PASS — 5 tests passing.

- [ ] **Step 6: Commit**

```bash
git add src/lib/payment/require-gateway-configured.ts src/lib/payment/__tests__/require-gateway-configured.test.ts
git commit -m "feat(payment): shared requireGatewayConfigured() helper for API routes"
```

---

### Task 2: Refactor `/api/webhooks/stripe` to use the shared guard

**Files:**
- Modify: `src/app/api/webhooks/stripe/route.ts`

- [ ] **Step 1: Confirm existing webhook tests still pass before refactor**

Run: `npm run test:run -- src/app/api/webhooks/stripe`
Expected: PASS — note the passing count for comparison.

- [ ] **Step 2: Replace the inline guard with `requireGatewayConfigured()`**

In `src/app/api/webhooks/stripe/route.ts`, replace lines 12-19 (the inline `process.env.PAYMENT_GATEWAY` check) with a call to the shared helper. The full updated top of the function:

```ts
import { NextResponse, type NextRequest } from "next/server";
import { getPaymentGateway } from "@/lib/payment/gateway";
import { createServiceClient } from "@/lib/supabase/server";
import { requireGatewayConfigured } from "@/lib/payment/require-gateway-configured";
import {
  handleCheckoutCompleted,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handleInvoicePaid,
  handleInvoicePaymentFailed,
} from "@/lib/payment/webhook-handler";

export async function POST(request: NextRequest) {
  const guard = requireGatewayConfigured();
  if (!guard.ok) return guard.response;

  const rawBody = await request.text();
  const stripeSig = request.headers.get("stripe-signature");
  const mockSig = request.headers.get("x-mock-signature");
  const provider = process.env.PAYMENT_GATEWAY;

  // Signature gate (provider is guaranteed "mock" | "stripe" after guard)
  if (provider === "stripe" && !stripeSig) {
    return NextResponse.json({ error: "missing stripe-signature" }, { status: 400 });
  }
  if (provider === "mock" && !mockSig) {
    return NextResponse.json({ error: "missing x-mock-signature" }, { status: 400 });
  }

  // ... rest unchanged
```

Leave everything after the signature gate (lines 29+) unchanged.

- [ ] **Step 3: Run all webhook tests to verify no regression**

Run: `npm run test:run -- src/app/api/webhooks/stripe`
Expected: PASS — same count as Step 1. The route now returns the new error envelope `{ error: { code: "gateway_unconfigured", message: ... } }` when `PAYMENT_GATEWAY` is unset. If existing tests asserted the old `{ error: "gateway misconfigured" }` shape, update those test expectations to match the new envelope.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/webhooks/stripe/route.ts src/app/api/webhooks/stripe/__tests__/route.test.ts
git commit -m "refactor(webhook): use shared requireGatewayConfigured() guard"
```

---

### Task 3: Widen `readActiveMembership` status filter to include paused/cancelled

**Files:**
- Modify: `src/lib/membership/membership-reader.ts`
- Modify: `src/lib/membership/__tests__/membership-reader.test.ts` (or wherever its tests live — search if path differs)

**Why:** `PlanManager` needs to render paused/cancelled rows; today they're filtered out. Widening the filter keeps `isActive: false` for those rows, so existing `isMember`-gated logic (pricing, booking gate) is unaffected.

- [ ] **Step 1: Find the existing reader tests**

```bash
find src/lib/membership -name "*.test.ts" -o -name "*.test.tsx"
```
Expected: list includes `membership-reader.test.ts`. If not, the test file is elsewhere — search via `grep -rl "readActiveMembership" src/lib/membership`.

- [ ] **Step 2: Write a failing test for the widened filter**

Append to `src/lib/membership/__tests__/membership-reader.test.ts` (matching its existing mocking pattern):

```ts
describe("readActiveMembership status filter", () => {
  it("returns a paused row with isActive=false", async () => {
    // Setup: mock supabase to return a row with status='paused'
    // (Match the mocking pattern used in existing tests in this file)
    const anon = mockSupabaseSelectingRow({
      id: "m1", user_id: "u1", status: "paused",
      stripe_subscription_id: "sub_1", stripe_customer_id: "cus_1",
      personal_hours_used: 2, virtual_tasks_used: 1,
      billing_period_start: "2026-05-01", billing_period_end: "2026-05-31",
      paused_at: "2026-05-15T12:00:00Z", cancel_at_period_end: false,
    });
    const service = mockSupabaseNoOp();
    const result = await readActiveMembership("u1", anon, service, "2026-05-24");
    expect(result.membership).not.toBeNull();
    expect((result.membership as { status: string }).status).toBe("paused");
    expect(result.isActive).toBe(false);
  });

  it("returns a cancelled row with isActive=false", async () => {
    const anon = mockSupabaseSelectingRow({
      id: "m1", user_id: "u1", status: "cancelled",
      stripe_subscription_id: "sub_1", stripe_customer_id: "cus_1",
      billing_period_start: "2026-04-01", billing_period_end: "2026-04-30",
    });
    const service = mockSupabaseNoOp();
    const result = await readActiveMembership("u1", anon, service, "2026-05-24");
    expect(result.membership).not.toBeNull();
    expect((result.membership as { status: string }).status).toBe("cancelled");
    expect(result.isActive).toBe(false);
  });
});
```

Note: `mockSupabaseSelectingRow` and `mockSupabaseNoOp` are illustrative — use the existing helper functions from the test file. If none exist, define them inline using the `.from().select().eq().in().maybeSingle()` chain that returns a `{ data, error }` shape.

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test:run -- src/lib/membership/__tests__/membership-reader.test.ts`
Expected: FAIL — paused/cancelled rows are filtered out, so `result.membership === null`.

- [ ] **Step 4: Widen the status filter and add isActive logic**

In `src/lib/membership/membership-reader.ts`, change line 35:

```ts
// BEFORE
    .in("status", ["active", "past_due"])

// AFTER
    .in("status", ["active", "past_due", "paused", "cancelled"])
```

Then add early-returns for the new statuses right after the existing `past_due` early-return (line 51-53). The full updated middle section:

```ts
  // past_due: return the row for dashboard display but never grant member
  // pricing — the customer's payment is failing and access is suspended.
  if (row.status === "past_due") {
    return { membership: row, isActive: false };
  }

  // paused / cancelled: visible to PlanManager but not "active" for any
  // pricing or booking-gate purpose.
  if (row.status === "paused" || row.status === "cancelled") {
    return { membership: row, isActive: false };
  }

  // Period covers today → no reset needed
  // ... rest unchanged
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test:run -- src/lib/membership/__tests__/membership-reader.test.ts`
Expected: PASS.

- [ ] **Step 6: Verify booking gate + pricing still behave correctly**

Run the broader test suite for any regressions:
```bash
npm run test:run -- src/lib/membership src/lib/pricing
```
Expected: PASS. `useMembership().isMember` continues to gate on `isActive`, which still returns false for paused/cancelled — so no pricing or booking-gate changes are needed.

- [ ] **Step 7: Commit**

```bash
git add src/lib/membership/membership-reader.ts src/lib/membership/__tests__/membership-reader.test.ts
git commit -m "feat(membership): readActiveMembership returns paused/cancelled rows with isActive=false"
```

---

### Task 4: Skip lazy rollover for Stripe-managed memberships

**Files:**
- Modify: `src/lib/membership/membership-reader.ts`
- Modify: `src/lib/membership/__tests__/membership-reader.test.ts`

**Why:** When a paused member resumes, the next read would otherwise trigger lazy rollover (zeroing hours used → granting fresh allowance). The spec requires preserving hours through pause; the source of truth for Stripe-managed periods is `invoice.paid`, not the calendar. Admin-created rows (no `stripe_subscription_id`) still use lazy rollover as a fallback.

**Trade-off documented:** Between resume-click and the next `invoice.paid` webhook arriving, the displayed `billing_period_end` may be in the past. The renewal-date copy in `PlanManager` will look slightly stale but is accurate (Stripe will charge them on the next renewal). Acceptable rough edge.

- [ ] **Step 1: Write a failing test**

Append to `src/lib/membership/__tests__/membership-reader.test.ts`:

```ts
it("skips lazy rollover for Stripe-managed memberships with expired periods", async () => {
  const anon = mockSupabaseSelectingRow({
    id: "m1", user_id: "u1", status: "active",
    stripe_subscription_id: "sub_1", stripe_customer_id: "cus_1",
    personal_hours_used: 2, virtual_tasks_used: 1,
    billing_period_start: "2026-04-01", billing_period_end: "2026-04-30",
    paused_at: null, cancel_at_period_end: false,
  });
  const service = mockSupabaseExpectingNoUpdate(); // throws if update() called
  const result = await readActiveMembership("u1", anon, service, "2026-05-24");
  // Period is expired, but row has stripe_subscription_id — preserve everything
  expect((result.membership as { personal_hours_used: number }).personal_hours_used).toBe(2);
  expect((result.membership as { billing_period_end: string }).billing_period_end).toBe("2026-04-30");
  expect(result.isActive).toBe(true);
});

it("still applies lazy rollover for admin-created memberships (no stripe_subscription_id)", async () => {
  // Existing behavior — this test asserts we didn't regress it
  const anon = mockSupabaseSelectingRow({
    id: "m1", user_id: "u1", status: "active",
    stripe_subscription_id: null, stripe_customer_id: null,
    personal_hours_used: 2, virtual_tasks_used: 1,
    billing_period_start: "2026-04-01", billing_period_end: "2026-04-30",
  });
  const service = mockSupabaseExpectingUpdate({
    personal_hours_used: 0,
    virtual_tasks_used: 0,
    billing_period_start: "2026-05-01",
    billing_period_end: "2026-05-31",
  });
  const result = await readActiveMembership("u1", anon, service, "2026-05-24");
  expect((result.membership as { personal_hours_used: number }).personal_hours_used).toBe(0);
  expect(result.isActive).toBe(true);
});
```

Use whatever helper-naming pattern the existing tests use. If `mockSupabaseExpectingNoUpdate` / `mockSupabaseExpectingUpdate` don't exist, define them inline — the `update()` chain should either throw if invoked unexpectedly, or return the mock-updated row.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/lib/membership/__tests__/membership-reader.test.ts`
Expected: FAIL — current code applies rollover regardless of `stripe_subscription_id`.

- [ ] **Step 3: Add the gate in `readActiveMembership`**

In `src/lib/membership/membership-reader.ts`, modify the period-expiry branch (currently around lines 55-90) so the lazy rollover only fires when `stripe_subscription_id` is null:

```ts
  // Period covers today → no reset needed
  if (!hasPeriodExpired(row.billing_period_end, today)) {
    return { membership: row, isActive: true };
  }

  // Stripe-managed memberships: the invoice.paid webhook is the source of
  // truth for period resets. Skip lazy rollover so pause/resume preserves
  // hours_used across the resume → next-invoice gap.
  if (row.stripe_subscription_id) {
    return { membership: row, isActive: true };
  }

  // Admin-created memberships (no stripe_subscription_id): apply the
  // lazy rollover as before.
  const reset = resetUsageForNewPeriod(
    // ... existing call unchanged
```

Cast the row type to include `stripe_subscription_id` if TypeScript complains — the column is on the SELECT (`*`) and is `string | null`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:run -- src/lib/membership`
Expected: PASS — all reader tests pass, including the two new cases.

- [ ] **Step 5: Commit**

```bash
git add src/lib/membership/membership-reader.ts src/lib/membership/__tests__/membership-reader.test.ts
git commit -m "feat(membership): skip lazy rollover for Stripe-managed memberships

Preserves hours_used through pause/resume cycles; invoice.paid webhook
is the source of truth for Stripe-managed period resets. Admin-created
memberships (no stripe_subscription_id) keep the lazy rollover fallback."
```

---

### Task 5: `POST /api/membership/portal` route

**Files:**
- Create: `src/app/api/membership/portal/route.ts`
- Create: `src/app/api/membership/portal/__tests__/route.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/api/membership/portal/__tests__/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockCreatePortal, mockGetUser, mockSupabaseSelect } = vi.hoisted(() => ({
  mockCreatePortal: vi.fn(),
  mockGetUser: vi.fn(),
  mockSupabaseSelect: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: () => ({ select: () => ({ eq: () => ({ in: () => ({ maybeSingle: mockSupabaseSelect }) }) }) }),
  })),
}));

vi.mock("@/lib/payment/gateway", () => ({
  getPaymentGateway: () => ({ createPortalSession: mockCreatePortal }),
}));

import { POST } from "../route";

function req(body: unknown = {}, origin = "https://staging.butlersinc.com") {
  return new NextRequest(`${origin}/api/membership/portal`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

const originalEnv = process.env.PAYMENT_GATEWAY;

describe("POST /api/membership/portal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PAYMENT_GATEWAY = "mock";
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "u1@example.com" } } });
    mockSupabaseSelect.mockResolvedValue({
      data: {
        id: "m1", user_id: "u1", status: "active",
        stripe_subscription_id: "sub_1", stripe_customer_id: "cus_1",
      },
      error: null,
    });
    mockCreatePortal.mockResolvedValue({ url: "/payment/simulate-portal?customer_id=cus_1" });
  });

  afterEach(() => {
    if (originalEnv === undefined) delete process.env.PAYMENT_GATEWAY;
    else process.env.PAYMENT_GATEWAY = originalEnv;
  });

  it("returns 500 when PAYMENT_GATEWAY is unset", async () => {
    delete process.env.PAYMENT_GATEWAY;
    const res = await POST(req());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe("gateway_unconfigured");
  });

  it("returns 401 when not signed in", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(req());
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("unauthenticated");
  });

  it("returns 422 no_subscription when no membership row", async () => {
    mockSupabaseSelect.mockResolvedValue({ data: null, error: null });
    const res = await POST(req());
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe("no_subscription");
  });

  it("returns 422 no_subscription when stripe_subscription_id is null (admin-created)", async () => {
    mockSupabaseSelect.mockResolvedValue({
      data: { id: "m1", user_id: "u1", status: "active", stripe_subscription_id: null, stripe_customer_id: null },
      error: null,
    });
    const res = await POST(req());
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe("no_subscription");
  });

  it("returns 422 no_subscription for cancelled rows", async () => {
    mockSupabaseSelect.mockResolvedValue({
      data: { id: "m1", user_id: "u1", status: "cancelled", stripe_subscription_id: "sub_1", stripe_customer_id: "cus_1" },
      error: null,
    });
    const res = await POST(req());
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe("no_subscription");
  });

  it("returns 422 no_customer when stripe_customer_id is null", async () => {
    mockSupabaseSelect.mockResolvedValue({
      data: { id: "m1", user_id: "u1", status: "active", stripe_subscription_id: "sub_1", stripe_customer_id: null },
      error: null,
    });
    const res = await POST(req());
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe("no_customer");
  });

  it("returns 502 gateway_error when gateway throws", async () => {
    mockCreatePortal.mockRejectedValue(new Error("network"));
    const res = await POST(req());
    expect(res.status).toBe(502);
    expect((await res.json()).error.code).toBe("gateway_error");
  });

  it("returns 200 with the gateway URL on the happy path", async () => {
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: "/payment/simulate-portal?customer_id=cus_1" });
    expect(mockCreatePortal).toHaveBeenCalledWith(expect.objectContaining({
      customerId: "cus_1",
      returnUrl: "https://staging.butlersinc.com/members/settings",
    }));
  });

  it("uses a custom returnUrl from the request body when provided", async () => {
    await POST(req({ returnUrl: "https://staging.butlersinc.com/members/dashboard" }));
    expect(mockCreatePortal).toHaveBeenCalledWith(expect.objectContaining({
      returnUrl: "https://staging.butlersinc.com/members/dashboard",
    }));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/app/api/membership/portal`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the route**

Create `src/app/api/membership/portal/route.ts`:

```ts
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getPaymentGateway } from "@/lib/payment/gateway";
import { requireGatewayConfigured } from "@/lib/payment/require-gateway-configured";
import { getSiteUrl } from "@/lib/site-url";

const schema = z.object({ returnUrl: z.string().url().optional() });

export async function POST(request: NextRequest) {
  const guard = requireGatewayConfigured();
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "unauthenticated", message: "Sign in required" } },
      { status: 401 }
    );
  }

  // Body is optional; only validate when present
  let parsedReturnUrl: string | undefined;
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "invalid_body", message: "Invalid request body" } },
        { status: 400 }
      );
    }
    parsedReturnUrl = parsed.data.returnUrl;
  } catch {
    // empty body OK
  }

  const { data: row } = await supabase
    .from("memberships")
    .select("id, status, stripe_subscription_id, stripe_customer_id")
    .eq("user_id", user.id)
    .in("status", ["active", "past_due", "paused"])
    .maybeSingle();

  if (!row || !row.stripe_subscription_id) {
    return NextResponse.json(
      { error: { code: "no_subscription", message: "No active subscription to manage" } },
      { status: 422 }
    );
  }
  if (!row.stripe_customer_id) {
    return NextResponse.json(
      { error: { code: "no_customer", message: "No Stripe customer on file" } },
      { status: 422 }
    );
  }

  try {
    const session = await getPaymentGateway().createPortalSession({
      customerId: row.stripe_customer_id,
      returnUrl: parsedReturnUrl ?? `${getSiteUrl(request)}/members/settings`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("not yet implemented")) {
      return NextResponse.json(
        { error: { code: "gateway_not_implemented", message: msg } },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: { code: "gateway_error", message: msg } },
      { status: 502 }
    );
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:run -- src/app/api/membership/portal`
Expected: PASS — all 8 tests.

If any test fails because the `.in("status", ...)` chain isn't mocked correctly, adjust the mock to match the actual chain length (the route uses `.from().select().eq().in().maybeSingle()`).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/membership/portal/
git commit -m "feat(membership): POST /api/membership/portal creates Customer Portal session"
```

---

### Task 6: `POST /api/membership/pause` route — pause action

**Files:**
- Create: `src/app/api/membership/pause/route.ts`
- Create: `src/app/api/membership/pause/__tests__/route.test.ts`

**Why this task only covers pause (not resume):** Splitting pause and resume into two task slices keeps each test set focused. Task 7 adds resume; the route is updated to handle both.

- [ ] **Step 1: Write the failing test for pause**

Create `src/app/api/membership/pause/__tests__/route.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  mockPauseSub, mockResumeSub, mockGetUser,
  mockSupabaseSelect, mockSupabaseUpdate,
} = vi.hoisted(() => ({
  mockPauseSub: vi.fn(),
  mockResumeSub: vi.fn(),
  mockGetUser: vi.fn(),
  mockSupabaseSelect: vi.fn(),
  mockSupabaseUpdate: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: () => ({
      select: () => ({ eq: () => ({ in: () => ({ maybeSingle: mockSupabaseSelect }) }) }),
      update: (patch: unknown) => ({
        eq: () => ({ eq: () => ({ select: () => ({ maybeSingle: () => mockSupabaseUpdate(patch) }) }) }),
      }),
    }),
  })),
}));

vi.mock("@/lib/payment/gateway", () => ({
  getPaymentGateway: () => ({
    pauseSubscription: mockPauseSub,
    resumeSubscription: mockResumeSub,
  }),
}));

import { POST } from "../route";

function req(body: unknown) {
  return new NextRequest("https://staging.butlersinc.com/api/membership/pause", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

const originalEnv = process.env.PAYMENT_GATEWAY;

describe("POST /api/membership/pause", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PAYMENT_GATEWAY = "mock";
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockSupabaseSelect.mockResolvedValue({
      data: {
        id: "m1", user_id: "u1", status: "active",
        stripe_subscription_id: "sub_1", cancel_at_period_end: false,
      },
      error: null,
    });
    mockSupabaseUpdate.mockResolvedValue({
      data: { id: "m1", status: "paused", paused_at: "2026-05-24T12:00:00.000Z" },
      error: null,
    });
    mockPauseSub.mockResolvedValue(undefined);
    mockResumeSub.mockResolvedValue(undefined);
  });

  afterEach(() => {
    if (originalEnv === undefined) delete process.env.PAYMENT_GATEWAY;
    else process.env.PAYMENT_GATEWAY = originalEnv;
  });

  it("returns 500 when PAYMENT_GATEWAY is unset", async () => {
    delete process.env.PAYMENT_GATEWAY;
    const res = await POST(req({ action: "pause" }));
    expect(res.status).toBe(500);
  });

  it("returns 401 when not signed in", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(req({ action: "pause" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid body shape", async () => {
    const res = await POST(req({ action: "explode" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("invalid_body");
  });

  it("returns 422 no_subscription for admin-created rows (sub_id null)", async () => {
    mockSupabaseSelect.mockResolvedValue({
      data: { id: "m1", user_id: "u1", status: "active", stripe_subscription_id: null, cancel_at_period_end: false },
      error: null,
    });
    const res = await POST(req({ action: "pause" }));
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe("no_subscription");
  });

  it("returns 409 invalid_transition when pausing an already-paused row", async () => {
    mockSupabaseSelect.mockResolvedValue({
      data: { id: "m1", user_id: "u1", status: "paused", stripe_subscription_id: "sub_1", cancel_at_period_end: false },
      error: null,
    });
    const res = await POST(req({ action: "pause" }));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.code).toBe("invalid_transition");
    expect(body.error.data).toMatchObject({ from: "paused", action: "pause" });
  });

  it("returns 409 invalid_transition when pausing past_due", async () => {
    mockSupabaseSelect.mockResolvedValue({
      data: { id: "m1", user_id: "u1", status: "past_due", stripe_subscription_id: "sub_1", cancel_at_period_end: false },
      error: null,
    });
    const res = await POST(req({ action: "pause" }));
    expect(res.status).toBe(409);
  });

  it("returns 409 invalid_transition when pausing a sub with cancel_at_period_end=true", async () => {
    mockSupabaseSelect.mockResolvedValue({
      data: { id: "m1", user_id: "u1", status: "active", stripe_subscription_id: "sub_1", cancel_at_period_end: true },
      error: null,
    });
    const res = await POST(req({ action: "pause" }));
    expect(res.status).toBe(409);
  });

  it("returns 502 gateway_error when gateway throws (DB unchanged)", async () => {
    mockPauseSub.mockRejectedValue(new Error("network"));
    const res = await POST(req({ action: "pause" }));
    expect(res.status).toBe(502);
    expect(mockSupabaseUpdate).not.toHaveBeenCalled();
  });

  it("returns 409 when the conditional UPDATE returns no rows (race)", async () => {
    mockSupabaseUpdate.mockResolvedValue({ data: null, error: null });
    const res = await POST(req({ action: "pause" }));
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("invalid_transition");
  });

  it("returns 200 { status: 'paused' } on the happy path; gateway called then DB updated", async () => {
    const res = await POST(req({ action: "pause" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "paused" });
    expect(mockPauseSub).toHaveBeenCalledWith("sub_1");
    expect(mockSupabaseUpdate).toHaveBeenCalledWith(expect.objectContaining({
      status: "paused",
      paused_at: expect.any(String),
    }));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/app/api/membership/pause`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the route (pause-only initially, resume added in Task 7)**

Create `src/app/api/membership/pause/route.ts`:

```ts
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getPaymentGateway } from "@/lib/payment/gateway";
import { requireGatewayConfigured } from "@/lib/payment/require-gateway-configured";

const schema = z.object({ action: z.enum(["pause", "resume"]) });

export async function POST(request: NextRequest) {
  const guard = requireGatewayConfigured();
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "unauthenticated", message: "Sign in required" } },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "invalid_body", message: "Invalid JSON body" } },
      { status: 400 }
    );
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "invalid_body", message: "Invalid request body" } },
      { status: 400 }
    );
  }
  const { action } = parsed.data;

  const { data: row } = await supabase
    .from("memberships")
    .select("id, user_id, status, stripe_subscription_id, cancel_at_period_end")
    .eq("user_id", user.id)
    .in("status", ["active", "past_due", "paused", "cancelled"])
    .maybeSingle();

  if (!row || !row.stripe_subscription_id) {
    return NextResponse.json(
      { error: { code: "no_subscription", message: "No active subscription to manage" } },
      { status: 422 }
    );
  }

  // State-machine guard (pause only in this task; Task 7 adds resume)
  if (action === "pause") {
    const allowed = row.status === "active" && !row.cancel_at_period_end;
    if (!allowed) {
      return NextResponse.json(
        {
          error: {
            code: "invalid_transition",
            message: "Cannot pause from current state",
            data: { from: row.status, cancel_at_period_end: row.cancel_at_period_end, action },
          },
        },
        { status: 409 }
      );
    }
  } else {
    // resume — implemented in Task 7
    return NextResponse.json(
      { error: { code: "not_implemented", message: "resume action will land in Task 7" } },
      { status: 501 }
    );
  }

  // Call gateway first; DB write only on gateway success
  try {
    await getPaymentGateway().pauseSubscription(row.stripe_subscription_id);
  } catch (err) {
    return NextResponse.json(
      { error: { code: "gateway_error", message: err instanceof Error ? err.message : String(err) } },
      { status: 502 }
    );
  }

  // Conditional UPDATE: only writes if status is still 'active' (defends
  // against a concurrent state change between our read and write)
  const { data: updated } = await supabase
    .from("memberships")
    .update({
      status: "paused",
      paused_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id)
    .eq("status", "active")
    .select()
    .maybeSingle();

  if (!updated) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_transition",
          message: "Membership state changed during pause",
          data: { from: "active", action: "pause" },
        },
      },
      { status: 409 }
    );
  }

  return NextResponse.json({ status: "paused" });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:run -- src/app/api/membership/pause`
Expected: PASS — 10 tests passing for pause.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/membership/pause/
git commit -m "feat(membership): POST /api/membership/pause — pause action with state-machine guard"
```

---

### Task 7: Extend `/api/membership/pause` with resume action

**Files:**
- Modify: `src/app/api/membership/pause/route.ts`
- Modify: `src/app/api/membership/pause/__tests__/route.test.ts`

- [ ] **Step 1: Add failing resume tests**

Append to `src/app/api/membership/pause/__tests__/route.test.ts`:

```ts
describe("POST /api/membership/pause — resume", () => {
  beforeEach(() => {
    process.env.PAYMENT_GATEWAY = "mock";
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
  });

  it("returns 409 invalid_transition when resuming an active row", async () => {
    mockSupabaseSelect.mockResolvedValue({
      data: { id: "m1", user_id: "u1", status: "active", stripe_subscription_id: "sub_1", cancel_at_period_end: false },
      error: null,
    });
    const res = await POST(req({ action: "resume" }));
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("invalid_transition");
  });

  it("returns 409 invalid_transition when resuming a cancelled row", async () => {
    mockSupabaseSelect.mockResolvedValue({
      data: { id: "m1", user_id: "u1", status: "cancelled", stripe_subscription_id: "sub_1", cancel_at_period_end: false },
      error: null,
    });
    const res = await POST(req({ action: "resume" }));
    expect(res.status).toBe(409);
  });

  it("returns 200 { status: 'active' } when resuming a paused row; gateway called then DB updated", async () => {
    mockSupabaseSelect.mockResolvedValue({
      data: { id: "m1", user_id: "u1", status: "paused", stripe_subscription_id: "sub_1", cancel_at_period_end: false },
      error: null,
    });
    mockSupabaseUpdate.mockResolvedValue({
      data: { id: "m1", status: "active", paused_at: null },
      error: null,
    });
    const res = await POST(req({ action: "resume" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "active" });
    expect(mockResumeSub).toHaveBeenCalledWith("sub_1");
    expect(mockSupabaseUpdate).toHaveBeenCalledWith(expect.objectContaining({
      status: "active",
      paused_at: null,
    }));
  });

  it("returns 502 gateway_error on resume gateway failure (DB unchanged)", async () => {
    mockSupabaseSelect.mockResolvedValue({
      data: { id: "m1", user_id: "u1", status: "paused", stripe_subscription_id: "sub_1", cancel_at_period_end: false },
      error: null,
    });
    mockResumeSub.mockRejectedValue(new Error("network"));
    const res = await POST(req({ action: "resume" }));
    expect(res.status).toBe(502);
    expect(mockSupabaseUpdate).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify failures**

Run: `npm run test:run -- src/app/api/membership/pause`
Expected: FAIL — resume currently returns 501.

- [ ] **Step 3: Replace the resume branch in `route.ts`**

In `src/app/api/membership/pause/route.ts`, replace the `else { ... 501 }` block and the pause-specific gateway/UPDATE blocks with a unified resume + pause flow. The full replacement starting at the state-machine guard:

```ts
  // State-machine guard
  if (action === "pause") {
    const allowed = row.status === "active" && !row.cancel_at_period_end;
    if (!allowed) {
      return NextResponse.json(
        {
          error: {
            code: "invalid_transition",
            message: "Cannot pause from current state",
            data: { from: row.status, cancel_at_period_end: row.cancel_at_period_end, action },
          },
        },
        { status: 409 }
      );
    }
  } else {
    // resume
    if (row.status !== "paused") {
      return NextResponse.json(
        {
          error: {
            code: "invalid_transition",
            message: "Cannot resume from current state",
            data: { from: row.status, action },
          },
        },
        { status: 409 }
      );
    }
  }

  // Call gateway first; DB write only on gateway success
  try {
    if (action === "pause") {
      await getPaymentGateway().pauseSubscription(row.stripe_subscription_id);
    } else {
      await getPaymentGateway().resumeSubscription(row.stripe_subscription_id);
    }
  } catch (err) {
    return NextResponse.json(
      { error: { code: "gateway_error", message: err instanceof Error ? err.message : String(err) } },
      { status: 502 }
    );
  }

  // Conditional UPDATE guarded by expected current status
  const expectedStatus = action === "pause" ? "active" : "paused";
  const newStatus = action === "pause" ? "paused" : "active";
  const patch =
    action === "pause"
      ? { status: "paused", paused_at: new Date().toISOString(), updated_at: new Date().toISOString() }
      : { status: "active", paused_at: null, updated_at: new Date().toISOString() };

  const { data: updated } = await supabase
    .from("memberships")
    .update(patch)
    .eq("id", row.id)
    .eq("status", expectedStatus)
    .select()
    .maybeSingle();

  if (!updated) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_transition",
          message: `Membership state changed during ${action}`,
          data: { from: expectedStatus, action },
        },
      },
      { status: 409 }
    );
  }

  return NextResponse.json({ status: newStatus });
}
```

- [ ] **Step 4: Run all pause-route tests**

Run: `npm run test:run -- src/app/api/membership/pause`
Expected: PASS — original 10 pause tests + 4 resume tests.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/membership/pause/
git commit -m "feat(membership): POST /api/membership/pause — resume action"
```

---

### Task 8: `PlanManager` component — state derivation + render skeleton

**Files:**
- Create: `src/components/membership/PlanManager.tsx`
- Create: `src/components/membership/__tests__/PlanManager.test.tsx`

This task wires the data hook + the state derivation function + a minimal render for each variant. Task 9 wires the action handlers.

- [ ] **Step 1: Write a failing test for state derivation across all 7 variants**

Create `src/components/membership/__tests__/PlanManager.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { render } from "@/test/test-utils";
import { PlanManager } from "../PlanManager";

const { mockUseMembership } = vi.hoisted(() => ({ mockUseMembership: vi.fn() }));
vi.mock("@/hooks/useMembership", () => ({
  useMembership: mockUseMembership,
}));

function setMembership(membership: unknown, isMember = false) {
  mockUseMembership.mockReturnValue({
    membership,
    isMember,
    isLoading: false,
    personalHoursRemaining: 0,
    virtualTasksRemaining: 0,
  });
}

const baseTier = {
  id: "tier-lite",
  slug: "lite" as const,
  name: "Lite",
  description: "",
  personalHoursIncluded: 5,
  virtualTasksIncluded: 3,
  monthlyPrice: 500,
  displayOrder: 1,
  isActive: true,
};

describe("PlanManager — state derivation + render", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders the 'none' variant when there is no membership", () => {
    setMembership(null);
    render(<PlanManager />);
    expect(screen.getByText(/Choose a plan/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /View plans/i })).toHaveAttribute("href", "/membership");
  });

  it("renders the 'active-self' (happy) variant — Manage + Pause buttons", () => {
    setMembership({
      tier: baseTier,
      status: "active",
      stripeSubscriptionId: "sub_1",
      cancelAtPeriodEnd: false,
      billingPeriodEnd: "2026-06-30",
      personalHoursTotal: 5, personalHoursUsed: 2,
      virtualTasksTotal: 3, virtualTasksUsed: 1,
      pausedAt: null,
    });
    render(<PlanManager />);
    expect(screen.getByText(/Plan: Lite/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Manage subscription/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Pause membership/i })).toBeInTheDocument();
  });

  it("renders the 'active-admin' variant when stripeSubscriptionId is null — read-only + contact us", () => {
    setMembership({
      tier: baseTier,
      status: "active",
      stripeSubscriptionId: null,
      cancelAtPeriodEnd: false,
      billingPeriodEnd: "2026-06-30",
      personalHoursTotal: 5, personalHoursUsed: 0,
      virtualTasksTotal: 3, virtualTasksUsed: 0,
      pausedAt: null,
    });
    render(<PlanManager />);
    expect(screen.getByText(/contact hello@butlersinc\.com/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Manage subscription/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Pause membership/i })).not.toBeInTheDocument();
  });

  it("renders the 'pending-cancel' variant when cancelAtPeriodEnd=true", () => {
    setMembership({
      tier: baseTier,
      status: "active",
      stripeSubscriptionId: "sub_1",
      cancelAtPeriodEnd: true,
      billingPeriodEnd: "2026-06-30",
      personalHoursTotal: 5, personalHoursUsed: 2,
      virtualTasksTotal: 3, virtualTasksUsed: 1,
      pausedAt: null,
    });
    render(<PlanManager />);
    expect(screen.getByText(/Cancellation scheduled/i)).toBeInTheDocument();
    expect(screen.getByText(/cancels on/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Reactivate subscription/i })).toBeInTheDocument();
  });

  it("renders the 'paused' variant", () => {
    setMembership({
      tier: baseTier,
      status: "paused",
      stripeSubscriptionId: "sub_1",
      cancelAtPeriodEnd: false,
      billingPeriodEnd: "2026-06-30",
      personalHoursTotal: 5, personalHoursUsed: 2,
      virtualTasksTotal: 3, virtualTasksUsed: 1,
      pausedAt: "2026-05-20T12:00:00Z",
    });
    render(<PlanManager />);
    expect(screen.getByText(/Membership paused/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Resume membership/i })).toBeInTheDocument();
  });

  it("renders the 'past_due' variant — red alert + Update payment only", () => {
    setMembership({
      tier: baseTier,
      status: "past_due",
      stripeSubscriptionId: "sub_1",
      cancelAtPeriodEnd: false,
      billingPeriodEnd: "2026-06-30",
      personalHoursTotal: 5, personalHoursUsed: 0,
      virtualTasksTotal: 3, virtualTasksUsed: 0,
      pausedAt: null,
    });
    render(<PlanManager />);
    expect(screen.getByText(/We couldn't charge your card/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Update payment method/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Pause membership/i })).not.toBeInTheDocument();
  });

  it("renders the 'cancelled' variant — Subscribe again link", () => {
    setMembership({
      tier: baseTier,
      status: "cancelled",
      stripeSubscriptionId: "sub_1",
      cancelAtPeriodEnd: false,
      billingPeriodEnd: "2026-04-30",
      personalHoursTotal: 5, personalHoursUsed: 0,
      virtualTasksTotal: 3, virtualTasksUsed: 0,
      pausedAt: null,
    });
    render(<PlanManager />);
    expect(screen.getByText(/Membership ended/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Subscribe again/i })).toHaveAttribute("href", "/membership");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/components/membership/__tests__/PlanManager.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `PlanManager`**

Create `src/components/membership/PlanManager.tsx`:

```tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useMembership } from "@/hooks/useMembership";
import type { Membership } from "@/types/membership";

type PlanView =
  | { kind: "none" }
  | { kind: "active-admin"; tier: string; hoursLeft: number; renewsAt: string }
  | { kind: "active-self"; tier: string; hoursLeft: number; hoursTotal: number; renewsAt: string }
  | { kind: "pending-cancel"; tier: string; hoursLeft: number; endsAt: string }
  | { kind: "paused"; tier: string; pausedAt: string | null }
  | { kind: "past_due"; tier: string }
  | { kind: "cancelled"; tier: string; endedAt: string };

function derivePlanView(m: Membership | null): PlanView {
  if (!m) return { kind: "none" };
  const tier = m.tier.name;
  const hoursLeft = m.personalHoursTotal - m.personalHoursUsed;
  if (m.status === "cancelled") return { kind: "cancelled", tier, endedAt: m.billingPeriodEnd };
  if (m.status === "paused") return { kind: "paused", tier, pausedAt: m.pausedAt };
  if (m.status === "past_due") return { kind: "past_due", tier };
  // status === 'active'
  if (!m.stripeSubscriptionId) {
    return { kind: "active-admin", tier, hoursLeft, renewsAt: m.billingPeriodEnd };
  }
  if (m.cancelAtPeriodEnd) {
    return { kind: "pending-cancel", tier, hoursLeft, endsAt: m.billingPeriodEnd };
  }
  return {
    kind: "active-self",
    tier,
    hoursLeft,
    hoursTotal: m.personalHoursTotal,
    renewsAt: m.billingPeriodEnd,
  };
}

function formatDate(iso: string): string {
  // Renders e.g. "30 Jun 2026". Matches the rest of the app's date copy style.
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function PlanManager() {
  const { membership, isLoading } = useMembership();
  if (isLoading) {
    return <p className="text-warm-gray">Loading...</p>;
  }
  const view = derivePlanView(membership);

  switch (view.kind) {
    case "none":
      return (
        <div>
          <p className="text-optical-white mb-3">Choose a plan</p>
          <p className="text-warm-gray text-sm mb-4">You don&rsquo;t have an active membership yet.</p>
          <Link
            href="/membership"
            className="inline-block bg-brass text-charcoal px-4 py-2 rounded-sm hover:bg-brass-muted"
          >
            View plans &rarr;
          </Link>
        </div>
      );

    case "active-admin":
      return (
        <div>
          <p className="text-optical-white text-lg font-serif">Plan: {view.tier}</p>
          <p className="text-warm-gray text-sm mt-1">Renews on {formatDate(view.renewsAt)}</p>
          <p className="text-warm-gray text-sm mt-4 pt-4 border-t border-primary-foreground/10">
            Your membership was set up by Butlers Inc directly. To change, pause, or cancel, contact hello@butlersinc.com.
          </p>
        </div>
      );

    case "active-self":
      return (
        <div>
          <p className="text-optical-white text-lg font-serif">Plan: {view.tier}</p>
          <p className="text-warm-gray text-sm mt-1">
            {view.hoursLeft} of {view.hoursTotal} hours remaining
          </p>
          <p className="text-warm-gray text-sm">Renews on {formatDate(view.renewsAt)}</p>
          <div className="mt-4 flex gap-3">
            <Button className="bg-brass text-charcoal hover:bg-brass-muted">Manage subscription &rarr;</Button>
            <Button variant="outline">Pause membership</Button>
          </div>
        </div>
      );

    case "pending-cancel":
      return (
        <div className="border border-yellow-700/40 bg-yellow-900/10 rounded-sm p-4">
          <p className="text-yellow-200 text-sm font-medium">Cancellation scheduled</p>
          <p className="text-warm-gray text-sm mt-2">
            Your {view.tier} membership cancels on {formatDate(view.endsAt)}. You can still use your remaining {view.hoursLeft}h until then.
          </p>
          <Button className="mt-3 bg-brass text-charcoal hover:bg-brass-muted">
            Reactivate subscription &rarr;
          </Button>
        </div>
      );

    case "paused":
      return (
        <div className="border border-yellow-700/40 bg-yellow-900/10 rounded-sm p-4">
          <p className="text-yellow-200 text-sm font-medium">Membership paused</p>
          <p className="text-warm-gray text-sm mt-2">
            {view.pausedAt ? `Paused on ${formatDate(view.pausedAt)}. ` : ""}
            Billing is suspended. Member pricing is not available until you resume.
          </p>
          <div className="mt-3 flex gap-3">
            <Button className="bg-brass text-charcoal hover:bg-brass-muted">Resume membership</Button>
            <Button variant="outline">Manage subscription &rarr;</Button>
          </div>
        </div>
      );

    case "past_due":
      return (
        <div className="border border-red-700/50 bg-red-900/10 rounded-sm p-4">
          <p className="text-red-300 text-sm font-medium">We couldn&rsquo;t charge your card</p>
          <p className="text-warm-gray text-sm mt-2">
            Update your payment to keep your {view.tier} benefits. Your hours are suspended in the meantime.
          </p>
          <Button className="mt-3 bg-brass text-charcoal hover:bg-brass-muted">
            Update payment method &rarr;
          </Button>
        </div>
      );

    case "cancelled":
      return (
        <div>
          <p className="text-warm-gray text-sm">
            Your {view.tier} membership ended on {formatDate(view.endedAt)}.
          </p>
          <Link
            href="/membership"
            className="inline-block mt-3 bg-brass text-charcoal px-4 py-2 rounded-sm hover:bg-brass-muted"
          >
            Subscribe again &rarr;
          </Link>
        </div>
      );
  }
}
```

Note on copy: no em dashes in any user-visible string (project rule). `&rsquo;` and `&rarr;` are HTML entities, not em dashes.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:run -- src/components/membership/__tests__/PlanManager.test.tsx`
Expected: PASS — 7 variant tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/membership/PlanManager.tsx src/components/membership/__tests__/PlanManager.test.tsx
git commit -m "feat(membership): PlanManager component with 7 view variants

Pure state derivation + render switch; action handlers added in Task 9."
```

---

### Task 9: Wire `PlanManager` action handlers

**Files:**
- Modify: `src/components/membership/PlanManager.tsx`
- Modify: `src/components/membership/__tests__/PlanManager.test.tsx`

- [ ] **Step 1: Write failing tests for action handlers**

Append to `src/components/membership/__tests__/PlanManager.test.tsx`:

```tsx
import userEvent from "@testing-library/user-event";
import { useQueryClient } from "@tanstack/react-query";

describe("PlanManager — action handlers", () => {
  const originalFetch = global.fetch;
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "location", {
      writable: true,
      value: { ...originalLocation, assign: vi.fn() },
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    Object.defineProperty(window, "location", { writable: true, value: originalLocation });
  });

  it("Manage subscription button POSTs /api/membership/portal and navigates to the returned URL", async () => {
    setMembership({
      tier: baseTier, status: "active", stripeSubscriptionId: "sub_1",
      cancelAtPeriodEnd: false, billingPeriodEnd: "2026-06-30",
      personalHoursTotal: 5, personalHoursUsed: 2,
      virtualTasksTotal: 3, virtualTasksUsed: 1, pausedAt: null,
    }, true);

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ url: "/payment/simulate-portal?customer_id=cus_1" }),
    });

    render(<PlanManager />);
    await userEvent.click(screen.getByRole("button", { name: /Manage subscription/i }));

    expect(global.fetch).toHaveBeenCalledWith("/api/membership/portal", expect.objectContaining({
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }));
    expect(window.location.assign).toHaveBeenCalledWith("/payment/simulate-portal?customer_id=cus_1");
  });

  it("Pause membership button POSTs /api/membership/pause with action=pause and invalidates the membership query", async () => {
    setMembership({
      tier: baseTier, status: "active", stripeSubscriptionId: "sub_1",
      cancelAtPeriodEnd: false, billingPeriodEnd: "2026-06-30",
      personalHoursTotal: 5, personalHoursUsed: 2,
      virtualTasksTotal: 3, virtualTasksUsed: 1, pausedAt: null,
    }, true);

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "paused" }),
    });

    render(<PlanManager />);
    await userEvent.click(screen.getByRole("button", { name: /Pause membership/i }));

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/membership/pause",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ action: "pause" }),
      })
    );
  });

  it("Resume button on a paused row POSTs action=resume", async () => {
    setMembership({
      tier: baseTier, status: "paused", stripeSubscriptionId: "sub_1",
      cancelAtPeriodEnd: false, billingPeriodEnd: "2026-06-30",
      personalHoursTotal: 5, personalHoursUsed: 2,
      virtualTasksTotal: 3, virtualTasksUsed: 1, pausedAt: "2026-05-20T12:00:00Z",
    });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "active" }),
    });

    render(<PlanManager />);
    await userEvent.click(screen.getByRole("button", { name: /Resume membership/i }));

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/membership/pause",
      expect.objectContaining({
        body: JSON.stringify({ action: "resume" }),
      })
    );
  });

  it("Renders an inline error when the API returns a non-2xx response", async () => {
    setMembership({
      tier: baseTier, status: "active", stripeSubscriptionId: "sub_1",
      cancelAtPeriodEnd: false, billingPeriodEnd: "2026-06-30",
      personalHoursTotal: 5, personalHoursUsed: 2,
      virtualTasksTotal: 3, virtualTasksUsed: 1, pausedAt: null,
    });
    global.fetch = vi.fn().mockResolvedValue({
      ok: false, status: 502,
      json: async () => ({ error: { code: "gateway_error", message: "network" } }),
    });

    render(<PlanManager />);
    await userEvent.click(screen.getByRole("button", { name: /Pause membership/i }));

    expect(await screen.findByText(/Something went wrong/i)).toBeInTheDocument();
  });
});
```

If `@testing-library/user-event` isn't already imported in this project, check `package.json` — it should be a peer of `@testing-library/react`. If missing, install with `npm i -D @testing-library/user-event`.

- [ ] **Step 2: Run tests to verify failure**

Run: `npm run test:run -- src/components/membership/__tests__/PlanManager.test.tsx`
Expected: FAIL on the four new tests — buttons currently have no `onClick`.

- [ ] **Step 3: Add the click handlers**

In `src/components/membership/PlanManager.tsx`, add state + handlers at the top of the component, and wire them into the buttons. Top of file becomes:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useMembership } from "@/hooks/useMembership";
import { useAuth } from "@/context/AuthContext";
import type { Membership } from "@/types/membership";
```

And inside the `PlanManager` component, after the existing `useMembership()` call and before the `switch`:

```tsx
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openPortal() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/membership/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        setError("Something went wrong. Please try again.");
        return;
      }
      const { url } = (await res.json()) as { url: string };
      window.location.assign(url);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function pauseOrResume(action: "pause" | "resume") {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/membership/pause", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        setError("Something went wrong. Please try again.");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["membership", user?.id] });
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }
```

Then wire the handlers into the relevant `Button` components by adding `onClick={...}` and `disabled={busy}` attributes:

- `active-self` Manage button: `onClick={openPortal} disabled={busy}`
- `active-self` Pause button: `onClick={() => pauseOrResume("pause")} disabled={busy}`
- `pending-cancel` Reactivate button: `onClick={openPortal} disabled={busy}`
- `paused` Resume button: `onClick={() => pauseOrResume("resume")} disabled={busy}`
- `paused` Manage button: `onClick={openPortal} disabled={busy}`
- `past_due` Update payment button: `onClick={openPortal} disabled={busy}`

And add an inline error block — at the very top of the component's return tree (above the `switch`), wrap everything so the error renders persistently:

```tsx
  return (
    <div>
      {error && (
        <p className="text-red-400 text-sm mb-3" role="alert">
          {error}
        </p>
      )}
      {renderVariant(view, { openPortal, pauseOrResume, busy })}
    </div>
  );
```

Refactor the existing `switch` into a small `renderVariant` function above the component:

```tsx
function renderVariant(
  view: PlanView,
  handlers: {
    openPortal: () => void;
    pauseOrResume: (action: "pause" | "resume") => void;
    busy: boolean;
  }
) {
  const { openPortal, pauseOrResume, busy } = handlers;
  switch (view.kind) {
    // ... cases as before, with onClick/disabled wired
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:run -- src/components/membership/__tests__/PlanManager.test.tsx`
Expected: PASS — all 11 tests (7 from Task 8 + 4 new).

- [ ] **Step 5: Commit**

```bash
git add src/components/membership/PlanManager.tsx src/components/membership/__tests__/PlanManager.test.tsx
git commit -m "feat(membership): PlanManager action handlers — portal + pause/resume"
```

---

### Task 10: Mount `PlanManager` on `/members/settings`

**Files:**
- Modify: `src/app/members/settings/page.tsx`

- [ ] **Step 1: Add the Plan section above the existing Profile section**

In `src/app/members/settings/page.tsx`, add an import at the top:

```tsx
import { PlanManager } from "@/components/membership/PlanManager";
```

And add a new `<section>` block immediately after the `<h1>` and before the Profile section (around line 142):

```tsx
        {/* Plan Section */}
        <section className="bg-primary-foreground/5 border border-primary-foreground/10 rounded-sm p-6 mb-6">
          <h2 className="text-lg font-serif font-semibold text-optical-white mb-4">Plan</h2>
          <PlanManager />
        </section>
```

- [ ] **Step 2: Manual smoke check (dev server)**

```bash
npm run dev
```
Open `http://localhost:3000/members/settings` while signed in. Expected: the new "Plan" section appears at the top of the form sections, rendering one of the 7 variants depending on the user's membership state. Stop the dev server.

- [ ] **Step 3: Run the full test suite to confirm no regression**

Run: `npm run test:run`
Expected: PASS — full suite. Note the pass count.

- [ ] **Step 4: Commit**

```bash
git add src/app/members/settings/page.tsx
git commit -m "feat(members): mount PlanManager on /members/settings"
```

---

### Task 11: Mock portal simulator page (`/payment/simulate-portal`)

**Files:**
- Create: `src/app/payment/simulate-portal/page.tsx`

This is a dev-only page. It's a server component (no client interactivity beyond `<form>` posts). Each button is a `<form action={...}>` that POSTs a synthetic webhook event to `/api/webhooks/stripe`, then redirects to `/members/settings`.

- [ ] **Step 1: Write the page**

Create `src/app/payment/simulate-portal/page.tsx`:

```tsx
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function fireWebhook(body: object): Promise<void> {
  const origin = (await headers()).get("origin") ?? "http://localhost:3000";
  await fetch(`${origin}/api/webhooks/stripe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-mock-signature": "1",
    },
    body: JSON.stringify(body),
  });
}

async function cancelAction(formData: FormData): Promise<void> {
  "use server";
  const subId = formData.get("sub_id") as string;
  const customerId = formData.get("customer_id") as string;
  const now = Math.floor(Date.now() / 1000);
  // Match the SubscriptionData shape from src/lib/payment/types.ts
  await fireWebhook({
    type: "customer.subscription.updated",
    created: now,
    data: {
      id: subId,
      customer: customerId,
      status: "active",
      cancel_at_period_end: true,
      current_period_start: now,
      current_period_end: now + 30 * 24 * 3600,
      pause_collection: null,
      items: { data: [] },
    },
  });
  redirect("/members/settings");
}

async function changePlanAction(formData: FormData): Promise<void> {
  "use server";
  const subId = formData.get("sub_id") as string;
  const customerId = formData.get("customer_id") as string;
  const priceId = formData.get("price_id") as string;
  const now = Math.floor(Date.now() / 1000);
  await fireWebhook({
    type: "customer.subscription.updated",
    created: now,
    data: {
      id: subId,
      customer: customerId,
      status: "active",
      cancel_at_period_end: false,
      current_period_start: now,
      current_period_end: now + 30 * 24 * 3600,
      pause_collection: null,
      items: { data: [{ price: { id: priceId } }] },
    },
  });
  redirect("/members/settings");
}

async function reactivateAction(formData: FormData): Promise<void> {
  "use server";
  const subId = formData.get("sub_id") as string;
  const customerId = formData.get("customer_id") as string;
  const now = Math.floor(Date.now() / 1000);
  await fireWebhook({
    type: "customer.subscription.updated",
    created: now,
    data: {
      id: subId,
      customer: customerId,
      status: "active",
      cancel_at_period_end: false,
      current_period_start: now,
      current_period_end: now + 30 * 24 * 3600,
      pause_collection: null,
      items: { data: [] },
    },
  });
  redirect("/members/settings");
}

async function updateCardFailAction(formData: FormData): Promise<void> {
  "use server";
  const subId = formData.get("sub_id") as string;
  const customerId = formData.get("customer_id") as string;
  const now = Math.floor(Date.now() / 1000);
  await fireWebhook({
    type: "invoice.payment_failed",
    created: now,
    data: {
      id: `in_mock_${now}`,
      customer: customerId,
      subscription: subId,
      period_start: now,
      period_end: now + 30 * 24 * 3600,
      status: "open",
    },
  });
  redirect("/members/settings");
}

async function triggerInvoicePaidAction(formData: FormData): Promise<void> {
  "use server";
  const subId = formData.get("sub_id") as string;
  const customerId = formData.get("customer_id") as string;
  const now = Math.floor(Date.now() / 1000);
  await fireWebhook({
    type: "invoice.paid",
    created: now,
    data: {
      id: `in_mock_${now}`,
      customer: customerId,
      subscription: subId,
      period_start: now,
      period_end: now + 30 * 24 * 3600,
      status: "paid",
    },
  });
  redirect("/members/settings");
}

interface PageProps {
  searchParams: Promise<{ customer_id?: string }>;
}

export default async function SimulatePortalPage({ searchParams }: PageProps) {
  // Production safety
  if (process.env.NODE_ENV === "production" && process.env.PAYMENT_GATEWAY !== "mock") {
    notFound();
  }

  const params = await searchParams;
  const customerId = params.customer_id;
  if (!customerId) notFound();

  // Find the membership for this customer
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const admin = createServiceClient();
  const { data: row } = await admin
    .from("memberships")
    .select("stripe_subscription_id, status, cancel_at_period_end, tier_id")
    .eq("user_id", user.id)
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (!row || !row.stripe_subscription_id) notFound();

  const subId = row.stripe_subscription_id;

  return (
    <div className="min-h-screen bg-charcoal text-optical-white p-12">
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-serif mb-2">Mock Customer Portal (dev only)</h1>
        <p className="text-warm-gray text-sm mb-6">
          Customer: {customerId} &middot; Subscription: {subId} &middot; Status: {row.status}
          {row.cancel_at_period_end ? " (cancel scheduled)" : ""}
        </p>

        <div className="space-y-3">
          {row.status === "active" && !row.cancel_at_period_end && (
            <form action={cancelAction}>
              <input type="hidden" name="sub_id" value={subId} />
              <input type="hidden" name="customer_id" value={customerId} />
              <button className="w-full text-left bg-primary-foreground/5 border border-primary-foreground/10 hover:border-brass/40 rounded-sm p-3" type="submit">
                Cancel subscription
              </button>
            </form>
          )}

          {row.status === "active" && (
            <>
              <form action={changePlanAction}>
                <input type="hidden" name="sub_id" value={subId} />
                <input type="hidden" name="customer_id" value={customerId} />
                <input type="hidden" name="price_id" value="mock_frequent" />
                <button className="w-full text-left bg-primary-foreground/5 border border-primary-foreground/10 hover:border-brass/40 rounded-sm p-3" type="submit">
                  Change to Frequent
                </button>
              </form>
              <form action={changePlanAction}>
                <input type="hidden" name="sub_id" value={subId} />
                <input type="hidden" name="customer_id" value={customerId} />
                <input type="hidden" name="price_id" value="mock_pro" />
                <button className="w-full text-left bg-primary-foreground/5 border border-primary-foreground/10 hover:border-brass/40 rounded-sm p-3" type="submit">
                  Change to Pro
                </button>
              </form>
            </>
          )}

          {row.cancel_at_period_end && (
            <form action={reactivateAction}>
              <input type="hidden" name="sub_id" value={subId} />
              <input type="hidden" name="customer_id" value={customerId} />
              <button className="w-full text-left bg-primary-foreground/5 border border-primary-foreground/10 hover:border-brass/40 rounded-sm p-3" type="submit">
                Reactivate subscription
              </button>
            </form>
          )}

          <form action={updateCardFailAction}>
            <input type="hidden" name="sub_id" value={subId} />
            <input type="hidden" name="customer_id" value={customerId} />
            <button className="w-full text-left bg-primary-foreground/5 border border-primary-foreground/10 hover:border-brass/40 rounded-sm p-3" type="submit">
              Update card (simulate decline)
            </button>
          </form>

          {row.status === "past_due" && (
            <form action={triggerInvoicePaidAction}>
              <input type="hidden" name="sub_id" value={subId} />
              <input type="hidden" name="customer_id" value={customerId} />
              <button className="w-full text-left bg-primary-foreground/5 border border-primary-foreground/10 hover:border-brass/40 rounded-sm p-3" type="submit">
                Trigger invoice.paid (recover from past_due)
              </button>
            </form>
          )}
        </div>

        <a href="/members/settings" className="mt-8 inline-block text-warm-gray text-sm hover:text-optical-white">
          &larr; Back to settings
        </a>
      </div>
    </div>
  );
}
```

Note on the "Update card (success)" button from the spec layout: Phase A's webhook handler already preserves paused state on `invoice.paid` and lazy-revives `past_due` on the next paid invoice. The simulator handles the "card fails" path explicitly; a "card succeeds" path is implicit — the user just clicks "Trigger invoice.paid" to simulate the recovery webhook. The button is named accordingly.

- [ ] **Step 2: Manual smoke check**

```bash
npm run dev
```
With a member who has an active mock subscription, navigate from `/members/settings` → click Manage subscription → simulator opens. Click "Cancel subscription" → expects a 302/303 back to `/members/settings`, panel now shows `pending-cancel`. Click Manage → simulator shows "Reactivate subscription" button. Click it → back to `active-self`. Stop dev server.

- [ ] **Step 3: Commit**

```bash
git add src/app/payment/simulate-portal/page.tsx
git commit -m "feat(payment): dev-only /payment/simulate-portal mock Customer Portal"
```

---

### Task 12: Extend webhook handler tests for cancel/reactivate + pause/resume sync

**Files:**
- Modify: `src/lib/payment/__tests__/webhook-handler.test.ts`

**Why:** Phase A's `handleSubscriptionUpdated` and `statusFromStripe` already cover these flows correctly, but explicit Phase B tests pin the behaviour against future regressions.

- [ ] **Step 1: Append new tests**

Append to `src/lib/payment/__tests__/webhook-handler.test.ts` (matching its existing mocking pattern):

```ts
describe("Phase B: cancel_at_period_end + pause sync", () => {
  it("customer.subscription.updated with cancel_at_period_end=true sets the flag and keeps status='active'", async () => {
    const db = mockDbWithRow({
      id: "m1", stripe_subscription_id: "sub_1",
      status: "active", cancel_at_period_end: false,
      updated_at: "2026-05-01T00:00:00Z",
    });
    await handleSubscriptionUpdated({
      type: "customer.subscription.updated",
      created: 1717000000,
      data: subscriptionFixture({ id: "sub_1", status: "active", cancel_at_period_end: true }),
    }, db.client);
    expect(db.updates).toContainEqual(expect.objectContaining({
      cancel_at_period_end: true,
      status: "active",
    }));
  });

  it("customer.subscription.updated with cancel_at_period_end=false (reactivation) unsets the flag", async () => {
    const db = mockDbWithRow({
      id: "m1", stripe_subscription_id: "sub_1",
      status: "active", cancel_at_period_end: true,
      updated_at: "2026-05-01T00:00:00Z",
    });
    await handleSubscriptionUpdated({
      type: "customer.subscription.updated",
      created: 1717000000,
      data: subscriptionFixture({ id: "sub_1", status: "active", cancel_at_period_end: false }),
    }, db.client);
    expect(db.updates).toContainEqual(expect.objectContaining({
      cancel_at_period_end: false,
    }));
  });

  it("customer.subscription.updated with Stripe status='paused' sets local status='paused'", async () => {
    const db = mockDbWithRow({
      id: "m1", stripe_subscription_id: "sub_1",
      status: "active", cancel_at_period_end: false,
      updated_at: "2026-05-01T00:00:00Z",
    });
    await handleSubscriptionUpdated({
      type: "customer.subscription.updated",
      created: 1717000000,
      data: subscriptionFixture({ id: "sub_1", status: "paused", cancel_at_period_end: false }),
    }, db.client);
    expect(db.updates).toContainEqual(expect.objectContaining({ status: "paused" }));
  });

  it("customer.subscription.updated paused → active flips status back", async () => {
    const db = mockDbWithRow({
      id: "m1", stripe_subscription_id: "sub_1",
      status: "paused", cancel_at_period_end: false,
      updated_at: "2026-05-01T00:00:00Z",
    });
    await handleSubscriptionUpdated({
      type: "customer.subscription.updated",
      created: 1717000000,
      data: subscriptionFixture({ id: "sub_1", status: "active", cancel_at_period_end: false }),
    }, db.client);
    expect(db.updates).toContainEqual(expect.objectContaining({ status: "active" }));
  });

  it("stale event (created < row.updated_at) is a no-op", async () => {
    const db = mockDbWithRow({
      id: "m1", stripe_subscription_id: "sub_1",
      status: "active", cancel_at_period_end: false,
      updated_at: "2026-06-01T00:00:00Z",
    });
    await handleSubscriptionUpdated({
      type: "customer.subscription.updated",
      created: 1717000000, // earlier than updated_at
      data: subscriptionFixture({ id: "sub_1", status: "paused", cancel_at_period_end: false }),
    }, db.client);
    expect(db.updates).toHaveLength(0);
  });
});
```

`mockDbWithRow` and `subscriptionFixture` use the patterns already in the file — replicate or extend them. `subscriptionFixture` is a small helper returning a `SubscriptionData` object with safe defaults (typical `current_period_start/end`, empty `items.data`, etc.) merged with the override.

- [ ] **Step 2: Run tests**

Run: `npm run test:run -- src/lib/payment/__tests__/webhook-handler.test.ts`
Expected: PASS — new Phase B tests + all pre-existing tests.

- [ ] **Step 3: Commit**

```bash
git add src/lib/payment/__tests__/webhook-handler.test.ts
git commit -m "test(payment): pin cancel/reactivate + pause sync in webhook-handler"
```

---

### Task 13: Booking-gate tests for paused / cancelled (touch-ups)

**Files:**
- Modify: `src/lib/membership/__tests__/member-hours.test.ts`
- Modify: `src/lib/pricing/__tests__/calculate-price.test.ts` (or wherever the pricing test lives — search if path differs)

**Why:** `hasSufficientMemberHours` already returns false for `past_due`. After Task 3, paused/cancelled rows are visible via `readActiveMembership` with `isActive: false`. We need explicit test coverage that the booking gate + pricing layer treat them as non-members.

- [ ] **Step 1: Search for the existing tests**

```bash
find src/lib/membership src/lib/pricing -name "*.test.ts"
```

- [ ] **Step 2: Add failing tests to member-hours**

Append to `src/lib/membership/__tests__/member-hours.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { hasSufficientMemberHours } from "../member-hours";

describe("hasSufficientMemberHours — non-active statuses", () => {
  it("returns false for paused membership even with hours remaining", () => {
    expect(hasSufficientMemberHours({
      personal_hours_total: 5, personal_hours_used: 0, status: "paused",
    }, 1)).toBe(false);
  });

  it("returns false for cancelled membership even with hours remaining", () => {
    expect(hasSufficientMemberHours({
      personal_hours_total: 5, personal_hours_used: 0, status: "cancelled",
    }, 1)).toBe(false);
  });

  it("returns false for past_due membership even with hours remaining (pre-existing behaviour pinned)", () => {
    expect(hasSufficientMemberHours({
      personal_hours_total: 5, personal_hours_used: 0, status: "past_due",
    }, 1)).toBe(false);
  });
});
```

- [ ] **Step 3: Run test to verify failure for paused / cancelled**

Run: `npm run test:run -- src/lib/membership/__tests__/member-hours.test.ts`
Expected: FAIL on paused + cancelled. The function currently only blocks `past_due`.

- [ ] **Step 4: Tighten `hasSufficientMemberHours`**

In `src/lib/membership/member-hours.ts`, replace the existing past_due-only guard:

```ts
// BEFORE
if (membership.status === "past_due") return false;

// AFTER
if (membership.status && membership.status !== "active") return false;
```

- [ ] **Step 5: Run tests to verify all pass**

Run: `npm run test:run -- src/lib/membership/__tests__/member-hours.test.ts`
Expected: PASS — all tests.

- [ ] **Step 6: Verify no regression in pricing**

Run: `npm run test:run -- src/lib/pricing src/lib/membership`
Expected: PASS — full set. The `calculate-price` tests rely on `useMembership().isMember`, which is gated on `isActive` — already false for paused/cancelled — so non-member pricing applies automatically.

- [ ] **Step 7: Commit**

```bash
git add src/lib/membership/member-hours.ts src/lib/membership/__tests__/member-hours.test.ts
git commit -m "feat(membership): hasSufficientMemberHours blocks all non-active statuses"
```

---

### Task 14: Update CLAUDE.md + verification

**Files:**
- Modify: `CLAUDE.md`
- Modify: `docs/superpowers/specs/2026-05-24-member-self-signup-design.md` (status header)

- [ ] **Step 1: Update CLAUDE.md Architecture tree**

In `CLAUDE.md`, add the following entries under `src/app/api/` (in the existing list):

```
  membership/portal/            # POST creates Customer Portal session (auth-gated)
  membership/pause/             # POST { action: 'pause' | 'resume' } self-serve pause
```

Under `src/app/` (page routes), add:

```
  payment/simulate-portal/      # Dev-only mock Customer Portal (NODE_ENV !== 'production' OR PAYMENT_GATEWAY === 'mock')
```

Under `src/components/membership/`, add:

```
  PlanManager.tsx               # Settings-page panel with 7 state variants (none/active-self/active-admin/pending-cancel/paused/past_due/cancelled)
```

Under `src/lib/payment/`, add:

```
  require-gateway-configured.ts # Shared 500 guard for routes that hit the payment gateway
```

Under **Key Patterns**, add a new bullet:

```
- **Self-serve plan management (Phase B):** `PlanManager.tsx` derives one of 7 view variants from a single `Membership` row; portal actions hit `POST /api/membership/portal` (server returns Stripe Customer Portal URL, browser navigates); pause/resume hit `POST /api/membership/pause` which calls the gateway then writes the DB synchronously via a status-guarded conditional UPDATE. Mock portal at `/payment/simulate-portal` fires synthetic webhooks for dev walks. Lazy UIOLO rollover is skipped for Stripe-managed memberships (those with `stripe_subscription_id`) — `invoice.paid` is the source of truth there; admin-created memberships still get lazy rollover as a fallback.
```

- [ ] **Step 2: Update Phase A spec status header**

In `docs/superpowers/specs/2026-05-24-member-self-signup-design.md`, update the status header and the implementation status table:

```markdown
**Status:** Phase A SHIPPED (PR #20, merged to staging 2026-05-24). Phase B SHIPPED (merged to staging YYYY-MM-DD).
```

```markdown
| **Phase B — self-serve** | ✅ SHIPPED | `PlanManager` on `/members/settings` with 7 view variants, `/api/membership/portal` (Stripe Customer Portal), `/api/membership/pause` (custom), mock portal simulator. See `docs/superpowers/specs/2026-05-24-phase-b-self-serve-design.md` for the full breakdown. |
```

- [ ] **Step 3: Run the full verification suite**

```bash
npm run test:run
npm run lint
npx tsc --noEmit
```

Expected:
- `test:run`: ~480-500 passing, 0 failing.
- `lint`: no new errors/warnings (5 errors / 12 warnings pre-existing, unchanged).
- `tsc`: clean.

If any fail, debug and fix in a separate commit (do not amend Phase B commits).

- [ ] **Step 4: Run the spec's 6 browser walks on staging**

Push the branch:

```bash
git push -u origin feat--phase-b-self-serve
```

Open the Vercel preview URL for the branch and walk through:

1. Pause flow (Section "Verification" #1 in the spec)
2. Cancel via mock portal (#2)
3. Plan-swap (#3)
4. past_due (#4)
5. Pause webhook idempotency (#5)
6. Admin-created member (#6)

Any failures get filed as fix commits on this branch before opening the PR.

- [ ] **Step 5: Commit docs**

```bash
git add CLAUDE.md docs/superpowers/specs/2026-05-24-member-self-signup-design.md
git commit -m "docs: reflect Phase B SHIPPED — CLAUDE.md + Phase A spec status"
```

- [ ] **Step 6: Open the PR**

```bash
gh pr create --base staging --title "feat: Phase B — self-serve plan management" --body "$(cat <<'EOF'
## Summary

Ships Phase B of member self-signup: self-serve plan management on top
of Phase A's funnel + provisioning.

- `PlanManager` on `/members/settings` with 7 view variants (none /
  active-self / active-admin / pending-cancel / paused / past_due /
  cancelled)
- `POST /api/membership/portal` returns a Stripe Customer Portal URL
  for cancel / plan-swap / update card
- `POST /api/membership/pause { action }` for pause and resume, with
  state-machine guards and conditional UPDATEs
- Dev-only `/payment/simulate-portal` for mock-mode walks
- Shared `requireGatewayConfigured()` helper lifted from the existing
  webhook route
- `readActiveMembership` now returns paused/cancelled rows with
  `isActive: false` so PlanManager can render them; lazy UIOLO rollover
  skipped for Stripe-managed memberships (preserves hours through
  pause/resume; `invoice.paid` is source of truth)
- `hasSufficientMemberHours` tightened to block all non-active statuses

Builds on PR #20 (Phase A). Real Stripe wiring is the next focused PR.

## Test plan

- [ ] `npm run test:run` — all tests pass (~480-500)
- [ ] `npm run lint` — no new warnings
- [ ] `npx tsc --noEmit` — clean
- [ ] Browser walks 1-6 from the spec pass on staging preview
- [ ] Webhook idempotency: replay pause-update twice, second is a no-op

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Spec coverage

| Spec section | Covered by |
|---|---|
| Q1: pause/resume sync write | Tasks 6, 7 |
| Q2: admin-created UI | Task 8 (active-admin variant) |
| Q3: past_due UI | Task 8 (past_due variant) + Task 9 handler |
| Q4: cancellation phases UI | Task 8 (pending-cancel + cancelled variants) + Task 9 handler |
| Q5: mock portal | Task 11 |
| Q6: UIOLO + paused | Task 4 |
| Q7: past_due booking gate | Task 13 |
| `requireGatewayConfigured` helper | Tasks 1, 2 |
| readActiveMembership filter widening | Task 3 |
| 7 PlanManager view variants | Task 8 |
| Action handlers + error inline | Task 9 |
| Settings page integration | Task 10 |
| Mock portal page | Task 11 |
| Webhook handler test pins | Task 12 |
| CLAUDE.md update | Task 14 |
| Phase A spec status update | Task 14 |

All sections of the spec have at least one task. The prereq tier-rename PR is explicitly out of scope (see header) and is owned by a separate plan.
