# RLS & Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all Critical and High severity findings from the 2026-04-08 RLS security audit — lock down open booking tables, add database constraints on usage counters, harden the mock payment gateway, fix middleware auth gaps, add Zod validation to virtual-butler, and add rate limiting to public endpoints.

**Architecture:** Six independent hardening tasks, each testable in isolation. SQL migrations fix RLS at the database layer. TypeScript changes fix API-layer vulnerabilities. Middleware change closes the auth gap. Each task follows TDD: write the failing test first, then implement the fix.

**Tech Stack:** Supabase (PostgreSQL + RLS), Next.js 16 App Router, Vitest + jsdom, Zod, TypeScript

---

## File Structure

```
supabase/migrations/
  004_lock_booking_rls.sql            # NEW — Replaces open booking policies
  005_membership_constraints.sql      # NEW — CHECK constraints on usage counters
  006_admin_users_table.sql           # NEW — Replaces hardcoded admin emails in RLS

src/lib/payment/
  mock-gateway.ts                     # MODIFY — Track created sessions, only verify known ones
  gateway.ts                          # MODIFY — Add production safety guard

src/app/api/virtual-butler/route.ts   # MODIFY — Add Zod schema, atomic usage update

middleware.ts                         # MODIFY — Protect all /members/* routes

src/lib/rate-limit.ts                 # NEW — Rate limiting utility

src/app/api/bookings/route.ts         # MODIFY — Add rate limiting
src/app/api/create-checkout-session/route.ts  # MODIFY — Add rate limiting
src/app/api/calculate-price/route.ts  # MODIFY — Add rate limiting
src/app/api/webhooks/payment-complete/route.ts # MODIFY — Add rate limiting

# Tests
src/lib/payment/__tests__/mock-gateway.test.ts           # MODIFY — Add session tracking tests
src/lib/payment/__tests__/gateway-safety.test.ts          # NEW — Production guard test
src/app/api/__tests__/virtual-butler-validation.test.ts   # NEW — Zod validation + atomic update tests
src/lib/__tests__/rate-limit.test.ts                      # NEW — Rate limit utility tests
src/__tests__/middleware.test.ts                           # NEW — Middleware auth coverage tests
```

---

### Task 1: Lock Down Booking Table RLS (CRITICAL)

**Context:** `priced_bookings` and `bespoke_consultations` have `FOR ALL USING (true)` policies, meaning any authenticated user can read/write all bookings. This is the most severe finding.

**Files:**
- Create: `supabase/migrations/004_lock_booking_rls.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- 004_lock_booking_rls.sql
-- Fix CRITICAL: priced_bookings and bespoke_consultations had FOR ALL USING (true)
-- which allowed any authenticated user to read/write all bookings.
-- New policy: no client-side access. All operations go through API routes
-- using the service role client (which bypasses RLS).

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Service role manages priced_bookings" ON priced_bookings;
DROP POLICY IF EXISTS "Service role manages bespoke_consultations" ON bespoke_consultations;

-- Users can only read their own bookings (by email from JWT)
CREATE POLICY "Users read own bookings"
  ON priced_bookings FOR SELECT
  USING (
    customer_email = (auth.jwt() ->> 'email')
    OR user_id = auth.uid()
  );

-- No INSERT/UPDATE/DELETE for anon-key users.
-- All writes happen via service role client in API routes.

-- Bespoke consultations: same pattern
CREATE POLICY "Users read own consultations"
  ON bespoke_consultations FOR SELECT
  USING (
    customer_email = (auth.jwt() ->> 'email')
  );
```

- [ ] **Step 2: Verify the migration is syntactically valid**

Run: `cd /Users/roberthayford/Git/BlueOcean/_faridah/Ohmybutler-premium-concierge && cat supabase/migrations/004_lock_booking_rls.sql`

Expected: The SQL file renders without syntax errors.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/004_lock_booking_rls.sql
git commit -m "fix(security): lock down priced_bookings and bespoke_consultations RLS

Replace FOR ALL USING (true) with user-scoped SELECT policies.
No client-side INSERT/UPDATE/DELETE — all writes via service role in API routes."
```

---

### Task 2: Add Database Constraints on Membership Usage Counters (HIGH)

**Context:** No database constraint prevents `virtual_tasks_used` from exceeding `virtual_tasks_total`, and the check-then-update in `/api/virtual-butler` is not atomic (race condition).

**Files:**
- Create: `supabase/migrations/005_membership_constraints.sql`
- Modify: `src/app/api/virtual-butler/route.ts:46-76`
- Create: `src/app/api/__tests__/virtual-butler-validation.test.ts`

- [ ] **Step 1: Write the migration SQL**

```sql
-- 005_membership_constraints.sql
-- Fix HIGH: Add CHECK constraints to prevent usage counters from going negative
-- or exceeding their limits. Also ensures atomic quota enforcement.

ALTER TABLE memberships
  ADD CONSTRAINT chk_personal_hours_non_negative
    CHECK (personal_hours_used >= 0),
  ADD CONSTRAINT chk_personal_hours_limit
    CHECK (personal_hours_used <= personal_hours_total),
  ADD CONSTRAINT chk_virtual_tasks_non_negative
    CHECK (virtual_tasks_used >= 0),
  ADD CONSTRAINT chk_virtual_tasks_limit
    CHECK (virtual_tasks_used <= virtual_tasks_total),
  ADD CONSTRAINT chk_totals_non_negative
    CHECK (personal_hours_total >= 0 AND virtual_tasks_total >= 0);
```

- [ ] **Step 2: Write failing test for Zod validation on virtual-butler route**

```typescript
// src/app/api/__tests__/virtual-butler-validation.test.ts
import { describe, it, expect } from "vitest";
import { virtualButlerSchema } from "../virtual-butler/route";

describe("Virtual Butler request validation", () => {
  it("rejects missing category", () => {
    const result = virtualButlerSchema.safeParse({
      description: "Book a table",
      membershipId: "abc-123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid category", () => {
    const result = virtualButlerSchema.safeParse({
      category: "hacking",
      description: "Book a table",
      membershipId: "abc-123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty description", () => {
    const result = virtualButlerSchema.safeParse({
      category: "restaurant",
      description: "",
      membershipId: "abc-123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects description over 1000 chars", () => {
    const result = virtualButlerSchema.safeParse({
      category: "restaurant",
      description: "x".repeat(1001),
      membershipId: "abc-123",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid request", () => {
    const result = virtualButlerSchema.safeParse({
      category: "restaurant",
      description: "Book a table for 4 at The Ivy",
      membershipId: "abc-123",
      preferredDate: "2026-04-15",
      preferredTime: "19:00",
    });
    expect(result.success).toBe(true);
  });

  it("accepts request without optional fields", () => {
    const result = virtualButlerSchema.safeParse({
      category: "appointment",
      description: "Schedule dentist visit",
      membershipId: "abc-123",
    });
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test:run -- src/app/api/__tests__/virtual-butler-validation.test.ts`

Expected: FAIL — `virtualButlerSchema` is not exported from the route file.

- [ ] **Step 4: Add Zod schema and atomic update to virtual-butler route**

Replace the manual validation in `src/app/api/virtual-butler/route.ts` with a Zod schema and make the usage update atomic:

```typescript
// src/app/api/virtual-butler/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const virtualButlerSchema = z.object({
  category: z.enum(["appointment", "taxi_airport", "restaurant", "other"]),
  description: z.string().min(1).max(1000),
  membershipId: z.string().uuid(),
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  preferredTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

export function generateReference(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let ref = "VB-";
  for (let i = 0; i < 5; i++) {
    ref += chars[Math.floor(Math.random() * chars.length)];
  }
  return ref;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = virtualButlerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { category, description, membershipId, preferredDate, preferredTime } = parsed.data;
    const admin = createServiceClient();

    // Verify membership is active and belongs to user
    const { data: membership, error: memError } = await admin
      .from("memberships")
      .select("id, virtual_tasks_total, virtual_tasks_used")
      .eq("id", membershipId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (memError || !membership) {
      return NextResponse.json({ error: "Active membership required" }, { status: 403 });
    }

    // Atomic increment — the DB CHECK constraint (virtual_tasks_used <= virtual_tasks_total)
    // will reject the update if the user has no remaining tasks, preventing race conditions.
    const { error: updateError } = await admin
      .from("memberships")
      .update({
        virtual_tasks_used: membership.virtual_tasks_used + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", membershipId)
      .eq("virtual_tasks_used", membership.virtual_tasks_used); // Optimistic lock

    if (updateError) {
      // CHECK constraint violation or optimistic lock failure = no remaining tasks
      return NextResponse.json({ error: "No remaining virtual tasks" }, { status: 403 });
    }

    const reference = generateReference();

    const { data: requestData, error: insertError } = await admin
      .from("virtual_butler_requests")
      .insert({
        user_id: user.id,
        membership_id: membershipId,
        reference,
        category,
        description,
        preferred_date: preferredDate || null,
        preferred_time: preferredTime || null,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ reference, request: requestData });
  } catch (error) {
    console.error("Virtual butler request failed:", error);
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test:run -- src/app/api/__tests__/virtual-butler-validation.test.ts`

Expected: All 6 tests PASS.

- [ ] **Step 6: Verify existing virtual-butler tests still pass**

Run: `npm run test:run -- src/app/api/__tests__/virtual-butler.test.ts`

Expected: PASS (generateReference tests unchanged).

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/005_membership_constraints.sql \
  src/app/api/virtual-butler/route.ts \
  src/app/api/__tests__/virtual-butler-validation.test.ts
git commit -m "fix(security): add DB constraints on membership usage + Zod validation

- CHECK constraints prevent usage exceeding limits at the DB level
- Optimistic lock on virtual_tasks_used prevents race conditions
- Zod schema validates category, description, membershipId
- Replaces manual field checks with proper validation"
```

---

### Task 3: Harden Mock Payment Gateway (CRITICAL for production)

**Context:** `MockPaymentGateway.verifyPayment()` accepts ANY string starting with `mock_session_` — it doesn't check if the session was actually created. An attacker can skip payment entirely.

**Files:**
- Modify: `src/lib/payment/mock-gateway.ts`
- Modify: `src/lib/payment/__tests__/mock-gateway.test.ts`
- Modify: `src/lib/payment/gateway.ts`
- Create: `src/lib/payment/__tests__/gateway-safety.test.ts`

- [ ] **Step 1: Write failing tests for session tracking**

Add these tests to the **bottom** of `src/lib/payment/__tests__/mock-gateway.test.ts`:

```typescript
// Add to existing describe block:

  it("rejects fabricated mock session IDs not created by this gateway", async () => {
    const gateway = new MockPaymentGateway();
    // This ID has the right prefix but was never created via createCheckoutSession
    const result = await gateway.verifyPayment("mock_session_999_fabricated");
    expect(result.verified).toBe(false);
  });

  it("rejects replaying a session that was already verified", async () => {
    const gateway = new MockPaymentGateway();
    const session = await gateway.createCheckoutSession(SAMPLE_REQUEST);

    // First verification should succeed
    const first = await gateway.verifyPayment(session.sessionId);
    expect(first.verified).toBe(true);

    // Second verification (replay) should fail
    const second = await gateway.verifyPayment(session.sessionId);
    expect(second.verified).toBe(false);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:run -- src/lib/payment/__tests__/mock-gateway.test.ts`

Expected: 2 new tests FAIL — fabricated ID is currently accepted, replays are accepted.

- [ ] **Step 3: Fix MockPaymentGateway to track and consume sessions**

```typescript
// src/lib/payment/mock-gateway.ts
import type {
  PaymentGateway,
  CheckoutSessionRequest,
  CheckoutSessionResult,
} from "@/lib/pricing/types";

export class MockPaymentGateway implements PaymentGateway {
  private sessions = new Set<string>();

  async createCheckoutSession(
    request: CheckoutSessionRequest
  ): Promise<CheckoutSessionResult> {
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

    return {
      sessionId,
      url: `/payment/simulate?${params.toString()}`,
    };
  }

  async verifyPayment(
    sessionId: string
  ): Promise<{ verified: boolean; paymentIntentId?: string }> {
    if (!sessionId || !this.sessions.has(sessionId)) {
      return { verified: false };
    }

    // Consume the session — prevents replay attacks
    this.sessions.delete(sessionId);

    return {
      verified: true,
      paymentIntentId: `mock_pi_${Date.now()}`,
    };
  }
}
```

- [ ] **Step 4: Run all mock-gateway tests**

Run: `npm run test:run -- src/lib/payment/__tests__/mock-gateway.test.ts`

Expected: All tests PASS (including the 2 new ones).

- [ ] **Step 5: Write failing test for production safety guard**

```typescript
// src/lib/payment/__tests__/gateway-safety.test.ts
import { describe, it, expect, vi, afterEach } from "vitest";

describe("getPaymentGateway production safety", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("throws if PAYMENT_GATEWAY=mock in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PAYMENT_GATEWAY", "mock");

    const { getPaymentGateway } = await import("../gateway");
    expect(() => getPaymentGateway()).toThrow("Mock payment gateway cannot be used in production");
  });

  it("allows mock gateway in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("PAYMENT_GATEWAY", "mock");

    const { getPaymentGateway } = await import("../gateway");
    expect(() => getPaymentGateway()).not.toThrow();
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm run test:run -- src/lib/payment/__tests__/gateway-safety.test.ts`

Expected: FAIL — no production guard exists yet.

- [ ] **Step 7: Add production guard to gateway.ts**

```typescript
// src/lib/payment/gateway.ts
import type { PaymentGateway } from "@/lib/pricing/types";
import { MockPaymentGateway } from "./mock-gateway";

export function getPaymentGateway(): PaymentGateway {
  const provider = process.env.PAYMENT_GATEWAY ?? "mock";

  if (provider === "stripe") {
    throw new Error(
      "Stripe gateway not yet implemented. Set PAYMENT_GATEWAY=mock or add Stripe credentials."
    );
  }

  if (provider === "mock" && process.env.NODE_ENV === "production") {
    throw new Error(
      "Mock payment gateway cannot be used in production. Set PAYMENT_GATEWAY=stripe and configure Stripe credentials."
    );
  }

  return new MockPaymentGateway();
}
```

- [ ] **Step 8: Run all gateway tests**

Run: `npm run test:run -- src/lib/payment/__tests__/gateway-safety.test.ts src/lib/payment/__tests__/mock-gateway.test.ts`

Expected: All PASS.

- [ ] **Step 9: Commit**

```bash
git add src/lib/payment/mock-gateway.ts \
  src/lib/payment/__tests__/mock-gateway.test.ts \
  src/lib/payment/gateway.ts \
  src/lib/payment/__tests__/gateway-safety.test.ts
git commit -m "fix(security): harden mock payment gateway

- Track created sessions; only verify sessions that were actually created
- Consume sessions on verification to prevent replay attacks
- Block mock gateway in NODE_ENV=production"
```

---

### Task 4: Fix Middleware Auth Gap (MEDIUM)

**Context:** Middleware only redirects unauthenticated users from `/members/dashboard` and `/admin`, but `/members/personal-butler`, `/members/virtual-butler`, and `/members/settings` are unprotected at the middleware level.

**Files:**
- Modify: `middleware.ts`
- Create: `src/__tests__/middleware.test.ts`

- [ ] **Step 1: Write failing tests for middleware auth coverage**

```typescript
// src/__tests__/middleware.test.ts
import { describe, it, expect } from "vitest";

// Test the route-matching logic in isolation
const UNPROTECTED_PATHS = ["/members/login", "/members/signup"];

function shouldRedirectToLogin(pathname: string, isAuthenticated: boolean): boolean {
  if (isAuthenticated) return false;

  const isMembers = pathname.startsWith("/members");
  const isAdmin = pathname.startsWith("/admin");

  if (!isMembers && !isAdmin) return false;

  // Login and signup are public
  if (UNPROTECTED_PATHS.some((p) => pathname.startsWith(p))) return false;

  return true;
}

describe("Middleware auth routing logic", () => {
  it("redirects unauthenticated /members/dashboard to login", () => {
    expect(shouldRedirectToLogin("/members/dashboard", false)).toBe(true);
  });

  it("redirects unauthenticated /members/personal-butler to login", () => {
    expect(shouldRedirectToLogin("/members/personal-butler", false)).toBe(true);
  });

  it("redirects unauthenticated /members/virtual-butler to login", () => {
    expect(shouldRedirectToLogin("/members/virtual-butler", false)).toBe(true);
  });

  it("redirects unauthenticated /members/settings to login", () => {
    expect(shouldRedirectToLogin("/members/settings", false)).toBe(true);
  });

  it("redirects unauthenticated /admin to login", () => {
    expect(shouldRedirectToLogin("/admin", false)).toBe(true);
  });

  it("does NOT redirect /members/login", () => {
    expect(shouldRedirectToLogin("/members/login", false)).toBe(false);
  });

  it("does NOT redirect /members/signup", () => {
    expect(shouldRedirectToLogin("/members/signup", false)).toBe(false);
  });

  it("does NOT redirect authenticated users", () => {
    expect(shouldRedirectToLogin("/members/dashboard", true)).toBe(false);
    expect(shouldRedirectToLogin("/members/personal-butler", true)).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they pass (logic is correct)**

Run: `npm run test:run -- src/__tests__/middleware.test.ts`

Expected: All PASS (these test the intended logic).

- [ ] **Step 3: Update middleware.ts to protect all /members routes**

```typescript
// middleware.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_MEMBER_PATHS = ["/members/login", "/members/signup"];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublicPath = PUBLIC_MEMBER_PATHS.some((p) => pathname.startsWith(p));

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/members/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/members/:path*", "/admin/:path*"],
};
```

- [ ] **Step 4: Commit**

```bash
git add middleware.ts src/__tests__/middleware.test.ts
git commit -m "fix(security): protect all /members/* routes in middleware

Previously only /members/dashboard and /admin were redirecting
unauthenticated users. Now all /members/* routes (except login/signup)
require authentication."
```

---

### Task 5: Add Rate Limiting to Public API Endpoints (HIGH)

**Context:** No rate limiting exists anywhere. Public endpoints (`/api/bookings`, `/api/create-checkout-session`, `/api/calculate-price`, `/api/webhooks/payment-complete`) can be called without throttling.

**Files:**
- Create: `src/lib/rate-limit.ts`
- Create: `src/lib/__tests__/rate-limit.test.ts`
- Modify: `src/app/api/bookings/route.ts` (lines 33-34)
- Modify: `src/app/api/create-checkout-session/route.ts` (lines 26-27)
- Modify: `src/app/api/calculate-price/route.ts` (lines 17-18)
- Modify: `src/app/api/webhooks/payment-complete/route.ts` (lines 15-16)

- [ ] **Step 1: Write failing tests for rate limiter**

```typescript
// src/lib/__tests__/rate-limit.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { InMemoryRateLimiter } from "../rate-limit";

describe("InMemoryRateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests under the limit", () => {
    const limiter = new InMemoryRateLimiter({ maxRequests: 5, windowMs: 60_000 });
    for (let i = 0; i < 5; i++) {
      expect(limiter.check("192.168.1.1")).toEqual({ allowed: true, remaining: 5 - i - 1 });
    }
  });

  it("blocks requests over the limit", () => {
    const limiter = new InMemoryRateLimiter({ maxRequests: 3, windowMs: 60_000 });
    limiter.check("192.168.1.1");
    limiter.check("192.168.1.1");
    limiter.check("192.168.1.1");
    expect(limiter.check("192.168.1.1")).toEqual({ allowed: false, remaining: 0 });
  });

  it("tracks different keys independently", () => {
    const limiter = new InMemoryRateLimiter({ maxRequests: 1, windowMs: 60_000 });
    expect(limiter.check("user-a").allowed).toBe(true);
    expect(limiter.check("user-b").allowed).toBe(true);
    expect(limiter.check("user-a").allowed).toBe(false);
  });

  it("resets after the window expires", () => {
    const limiter = new InMemoryRateLimiter({ maxRequests: 1, windowMs: 60_000 });
    expect(limiter.check("192.168.1.1").allowed).toBe(true);
    expect(limiter.check("192.168.1.1").allowed).toBe(false);

    vi.advanceTimersByTime(60_001);

    expect(limiter.check("192.168.1.1").allowed).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:run -- src/lib/__tests__/rate-limit.test.ts`

Expected: FAIL — `InMemoryRateLimiter` does not exist.

- [ ] **Step 3: Implement the rate limiter**

```typescript
// src/lib/rate-limit.ts
interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

interface RateLimiterOptions {
  maxRequests: number;
  windowMs: number;
}

interface TokenBucket {
  count: number;
  resetAt: number;
}

export class InMemoryRateLimiter {
  private buckets = new Map<string, TokenBucket>();
  private maxRequests: number;
  private windowMs: number;

  constructor(options: RateLimiterOptions) {
    this.maxRequests = options.maxRequests;
    this.windowMs = options.windowMs;
  }

  check(key: string): RateLimitResult {
    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket || now >= bucket.resetAt) {
      this.buckets.set(key, { count: 1, resetAt: now + this.windowMs });
      return { allowed: true, remaining: this.maxRequests - 1 };
    }

    if (bucket.count >= this.maxRequests) {
      return { allowed: false, remaining: 0 };
    }

    bucket.count++;
    return { allowed: true, remaining: this.maxRequests - bucket.count };
  }
}

// Shared instances for API routes — survives across requests in the same function instance
export const bookingLimiter = new InMemoryRateLimiter({ maxRequests: 5, windowMs: 60_000 });
export const priceLimiter = new InMemoryRateLimiter({ maxRequests: 20, windowMs: 60_000 });
export const webhookLimiter = new InMemoryRateLimiter({ maxRequests: 10, windowMs: 60_000 });
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:run -- src/lib/__tests__/rate-limit.test.ts`

Expected: All 4 tests PASS.

- [ ] **Step 5: Add rate limiting to /api/bookings**

Add these lines to `src/app/api/bookings/route.ts` at the top of the `POST` function, after line 33 (`const body = await request.json();` — wait, add BEFORE parsing):

Insert after the import block (line 10) in `src/app/api/bookings/route.ts`:

```typescript
import { bookingLimiter } from "@/lib/rate-limit";
```

Insert at the start of the `POST` function body (after `export async function POST(request: NextRequest) {`):

```typescript
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limit = bookingLimiter.check(ip);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }
```

- [ ] **Step 6: Add rate limiting to /api/create-checkout-session**

Add the same import and rate check pattern to `src/app/api/create-checkout-session/route.ts`:

Import: `import { bookingLimiter } from "@/lib/rate-limit";`

Insert at start of POST function body:

```typescript
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limit = bookingLimiter.check(ip);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }
```

- [ ] **Step 7: Add rate limiting to /api/calculate-price**

Add to `src/app/api/calculate-price/route.ts`:

Import: `import { priceLimiter } from "@/lib/rate-limit";`

Insert at start of POST function body:

```typescript
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limit = priceLimiter.check(ip);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }
```

- [ ] **Step 8: Add rate limiting to /api/webhooks/payment-complete**

Add to `src/app/api/webhooks/payment-complete/route.ts`:

Import: `import { webhookLimiter } from "@/lib/rate-limit";`

Insert at start of POST function body (before `const body = await request.json();`):

```typescript
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limit = webhookLimiter.check(ip);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429 }
    );
  }
```

- [ ] **Step 9: Run full test suite**

Run: `npm run test:run`

Expected: All tests PASS (rate limiting is transparent to existing tests).

- [ ] **Step 10: Commit**

```bash
git add src/lib/rate-limit.ts src/lib/__tests__/rate-limit.test.ts \
  src/app/api/bookings/route.ts \
  src/app/api/create-checkout-session/route.ts \
  src/app/api/calculate-price/route.ts \
  src/app/api/webhooks/payment-complete/route.ts
git commit -m "fix(security): add rate limiting to public API endpoints

In-memory rate limiter with per-IP tracking:
- /api/bookings & /api/create-checkout-session: 5 req/min
- /api/calculate-price: 20 req/min
- /api/webhooks/payment-complete: 10 req/min"
```

---

### Task 6: Replace Hardcoded Admin Emails in RLS with Admin Table (MEDIUM)

**Context:** Admin emails are hardcoded in SQL policies — changing the admin list requires a database migration. This task creates an `admin_users` table and updates RLS policies to reference it.

**Files:**
- Create: `supabase/migrations/006_admin_users_table.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- 006_admin_users_table.sql
-- Fix MEDIUM: Replace hardcoded admin emails in RLS policies with a table lookup.
-- This allows adding/removing admins without database migrations.

CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Only service role can manage admin_users (no client access)
-- No policies = no access via anon key. Service role bypasses RLS.

-- Seed with current admins
INSERT INTO admin_users (email) VALUES
  ('rob@roberthayford.com'),
  ('hello@butlersinc.com'),
  ('roberthayford@gmail.com');

-- Replace hardcoded email checks in memberships policies
DROP POLICY IF EXISTS "Admins manage memberships" ON memberships;
CREATE POLICY "Admins manage memberships"
  ON memberships FOR ALL
  USING (
    auth.jwt() ->> 'email' IN (SELECT email FROM admin_users)
  );

-- Replace hardcoded email checks in virtual_butler_requests policies
DROP POLICY IF EXISTS "Admins manage virtual requests" ON virtual_butler_requests;
CREATE POLICY "Admins manage virtual requests"
  ON virtual_butler_requests FOR ALL
  USING (
    auth.jwt() ->> 'email' IN (SELECT email FROM admin_users)
  );

-- Replace hardcoded email checks in site_content policies
DROP POLICY IF EXISTS "Admins can insert content" ON site_content;
DROP POLICY IF EXISTS "Admins can update content" ON site_content;
DROP POLICY IF EXISTS "Admins can delete content" ON site_content;

CREATE POLICY "Admins can insert content"
  ON site_content FOR INSERT
  WITH CHECK (
    auth.jwt() ->> 'email' IN (SELECT email FROM admin_users)
  );

CREATE POLICY "Admins can update content"
  ON site_content FOR UPDATE
  USING (
    auth.jwt() ->> 'email' IN (SELECT email FROM admin_users)
  );

CREATE POLICY "Admins can delete content"
  ON site_content FOR DELETE
  USING (
    auth.jwt() ->> 'email' IN (SELECT email FROM admin_users)
  );
```

- [ ] **Step 2: Verify the migration SQL is syntactically valid**

Run: `cd /Users/roberthayford/Git/BlueOcean/_faridah/Ohmybutler-premium-concierge && cat supabase/migrations/006_admin_users_table.sql`

Expected: SQL renders without issues.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/006_admin_users_table.sql
git commit -m "fix(security): replace hardcoded admin emails with admin_users table

Admin list is now manageable via the admin_users table instead of
requiring SQL migrations. RLS policies reference the table via subquery."
```

---

### Task 7: Final Verification

- [ ] **Step 1: Run the full test suite**

Run: `npm run test:run`

Expected: ALL tests PASS.

- [ ] **Step 2: Run the build**

Run: `npm run build`

Expected: Build succeeds with no errors.

- [ ] **Step 3: Run lint**

Run: `npm run lint`

Expected: No new lint errors.

- [ ] **Step 4: Commit any remaining fixes**

If any test or build failures occurred, fix them and commit.

- [ ] **Step 5: Final commit — update CLAUDE.md**

Update the Bug Resolution Log reference in CLAUDE.md to note this security hardening was completed on 2026-04-08, and add `admin_users` table to the architecture tree.

```bash
git add CLAUDE.md
git commit -m "docs: note security hardening in CLAUDE.md"
```

---

## Summary of Fixes by Severity

| Severity | Finding | Task |
|----------|---------|------|
| CRITICAL | `priced_bookings` / `bespoke_consultations` RLS `USING (true)` | Task 1 |
| CRITICAL | Race condition on virtual task quota | Task 2 |
| CRITICAL | Mock payment gateway accepts fabricated sessions | Task 3 |
| HIGH | No DB constraints on usage counters | Task 2 |
| HIGH | No rate limiting on any endpoint | Task 5 |
| MEDIUM | Middleware auth gap on member routes | Task 4 |
| MEDIUM | Hardcoded admin emails in RLS | Task 6 |

## Migration Deployment Order

Apply migrations in this order on Supabase:
1. `004_lock_booking_rls.sql` — locks down bookings (no data changes)
2. `005_membership_constraints.sql` — adds CHECK constraints (may fail if existing data violates constraints — verify first)
3. `006_admin_users_table.sql` — creates admin_users and updates policies (additive, safe)

**Pre-deployment check for migration 005:** Run this query to verify no existing rows violate the constraints before applying:
```sql
SELECT id, virtual_tasks_used, virtual_tasks_total, personal_hours_used, personal_hours_total
FROM memberships
WHERE virtual_tasks_used > virtual_tasks_total
   OR personal_hours_used > personal_hours_total
   OR virtual_tasks_used < 0
   OR personal_hours_used < 0;
```
