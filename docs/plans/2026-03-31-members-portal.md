# Members Portal Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a membership layer with Personal Butler (hours-based) and Virtual Butler (task-based) pathways to the member dashboard.

**Architecture:** New Supabase tables for membership tiers, per-user memberships, and virtual butler requests. Dashboard becomes a two-card chooser. Personal Butler reuses existing BookingFlow with member pricing override. Virtual Butler is a new request form. Admin-activated memberships for soft launch.

**Tech Stack:** Next.js App Router, React 19, Supabase (auth + DB), React Query, Vitest + Testing Library, Tailwind CSS v4, Framer Motion

**Design doc:** `docs/plans/2026-03-31-members-portal-design.md`

---

## Open Questions for Faridah

These need answers. Development proceeds with defaults noted in parentheses.

1. Member pricing rate — flat £35/hr for all self-service butlers? What about Bougie/Bespoke? *(default: £35/hr self-service, Bougie/Bespoke remain consultation)*
2. Do unused virtual tasks roll over? *(default: no rollover)*
3. Hours and tasks per tier? *(default: Lite 5hrs/3tasks, Essential 15hrs/8tasks, Heavy 30hrs/15tasks)*
4. Monthly price per tier? *(default: Lite £49, Essential £99, Heavy £199)*
5. How are memberships activated? *(default: admin-activated via Supabase)*
6. Overage policy when hours exceeded? *(default: allowed at member rate)*
7. Virtual task categories beyond appointments/taxi/airport? *(default: Appointment, Taxi & Airport, Restaurant, Other)*
8. Does urgency multiplier apply to member bookings? *(default: no, flat member rate)*
9. Do non-members keep guest booking access? *(default: yes)*
10. Move booking history or keep on dashboard? *(default: collapsible section on dashboard)*

---

## Task 1: Membership Data Types

**Files:**
- Create: `src/types/membership.ts`
- Test: `src/types/__tests__/membership.test.ts`

**Step 1: Write the failing test**

Create `src/types/__tests__/membership.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import type {
  MembershipTier,
  Membership,
  VirtualButlerRequest,
  VirtualTaskCategory,
} from "../membership";

describe("Membership types", () => {
  it("MembershipTier has required fields", () => {
    const tier: MembershipTier = {
      id: "tier-1",
      slug: "lite",
      name: "Lite",
      description: "Entry level membership",
      personalHoursIncluded: 5,
      virtualTasksIncluded: 3,
      monthlyPrice: 49,
      displayOrder: 1,
      isActive: true,
    };
    expect(tier.slug).toBe("lite");
    expect(tier.personalHoursIncluded).toBe(5);
  });

  it("Membership tracks usage with remaining calculations", () => {
    const membership: Membership = {
      id: "mem-1",
      userId: "user-1",
      tierId: "tier-1",
      tier: {
        id: "tier-1",
        slug: "essential",
        name: "Essential",
        description: "Mid-tier",
        personalHoursIncluded: 15,
        virtualTasksIncluded: 8,
        monthlyPrice: 99,
        displayOrder: 2,
        isActive: true,
      },
      personalHoursTotal: 15,
      personalHoursUsed: 7,
      virtualTasksTotal: 8,
      virtualTasksUsed: 3,
      billingPeriodStart: "2026-04-01",
      billingPeriodEnd: "2026-04-30",
      status: "active",
      createdAt: "2026-03-31T00:00:00Z",
      updatedAt: "2026-03-31T00:00:00Z",
    };
    expect(membership.personalHoursTotal - membership.personalHoursUsed).toBe(8);
    expect(membership.virtualTasksTotal - membership.virtualTasksUsed).toBe(5);
    expect(membership.status).toBe("active");
  });

  it("VirtualButlerRequest has required fields", () => {
    const request: VirtualButlerRequest = {
      id: "vr-1",
      userId: "user-1",
      membershipId: "mem-1",
      reference: "VB-ABC12",
      category: "appointment",
      description: "Book dentist appointment for Tuesday",
      preferredDate: "2026-04-05",
      preferredTime: "14:00",
      status: "pending",
      adminNotes: null,
      createdAt: "2026-03-31T10:00:00Z",
      updatedAt: "2026-03-31T10:00:00Z",
    };
    expect(request.category).toBe("appointment");
    expect(request.status).toBe("pending");
  });

  it("VirtualTaskCategory covers all categories", () => {
    const categories: VirtualTaskCategory[] = [
      "appointment",
      "taxi_airport",
      "restaurant",
      "other",
    ];
    expect(categories).toHaveLength(4);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/types/__tests__/membership.test.ts`
Expected: FAIL — module not found

**Step 3: Write the types**

Create `src/types/membership.ts`:
```typescript
export type TierSlug = "lite" | "essential" | "heavy";
export type MembershipStatus = "active" | "paused" | "cancelled";
export type VirtualTaskCategory = "appointment" | "taxi_airport" | "restaurant" | "other";
export type VirtualRequestStatus = "pending" | "in_progress" | "completed" | "cancelled";

export interface MembershipTier {
  id: string;
  slug: TierSlug;
  name: string;
  description: string;
  personalHoursIncluded: number;
  virtualTasksIncluded: number;
  monthlyPrice: number;
  displayOrder: number;
  isActive: boolean;
}

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
  createdAt: string;
  updatedAt: string;
}

export interface VirtualButlerRequest {
  id: string;
  userId: string;
  membershipId: string;
  reference: string;
  category: VirtualTaskCategory;
  description: string;
  preferredDate: string | null;
  preferredTime: string | null;
  status: VirtualRequestStatus;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/types/__tests__/membership.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/types/membership.ts src/types/__tests__/membership.test.ts
git commit -m "feat: add membership type definitions"
```

---

## Task 2: Membership Tier Config Data

**Files:**
- Create: `src/data/membership-config.ts`
- Test: `src/data/__tests__/membership-config.test.ts`

**Step 1: Write the failing test**

Create `src/data/__tests__/membership-config.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import {
  MEMBERSHIP_TIERS,
  VIRTUAL_TASK_CATEGORIES,
  MEMBER_HOURLY_RATE,
  getTierBySlug,
} from "../membership-config";

describe("membership-config", () => {
  it("defines three tiers in order", () => {
    expect(MEMBERSHIP_TIERS).toHaveLength(3);
    expect(MEMBERSHIP_TIERS[0].slug).toBe("lite");
    expect(MEMBERSHIP_TIERS[1].slug).toBe("essential");
    expect(MEMBERSHIP_TIERS[2].slug).toBe("heavy");
  });

  it("each tier has hours and tasks", () => {
    for (const tier of MEMBERSHIP_TIERS) {
      expect(tier.personalHoursIncluded).toBeGreaterThan(0);
      expect(tier.virtualTasksIncluded).toBeGreaterThan(0);
      expect(tier.monthlyPrice).toBeGreaterThan(0);
    }
  });

  it("MEMBER_HOURLY_RATE is the budget rate", () => {
    expect(MEMBER_HOURLY_RATE).toBe(35);
  });

  it("defines virtual task categories with labels", () => {
    expect(VIRTUAL_TASK_CATEGORIES).toHaveLength(4);
    const keys = VIRTUAL_TASK_CATEGORIES.map((c) => c.key);
    expect(keys).toContain("appointment");
    expect(keys).toContain("taxi_airport");
    expect(keys).toContain("restaurant");
    expect(keys).toContain("other");
  });

  it("getTierBySlug returns the correct tier", () => {
    const essential = getTierBySlug("essential");
    expect(essential?.name).toBe("Essential");
  });

  it("getTierBySlug returns undefined for invalid slug", () => {
    expect(getTierBySlug("platinum" as any)).toBeUndefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/data/__tests__/membership-config.test.ts`
Expected: FAIL

**Step 3: Write the config**

Create `src/data/membership-config.ts`:
```typescript
import type { MembershipTier, VirtualTaskCategory, TierSlug } from "@/types/membership";

/** Member hourly rate — matches Budget Butler rate as incentive */
export const MEMBER_HOURLY_RATE = 35;

export const MEMBERSHIP_TIERS: MembershipTier[] = [
  {
    id: "tier-lite",
    slug: "lite",
    name: "Lite",
    description: "Perfect for occasional butler needs",
    personalHoursIncluded: 5,
    virtualTasksIncluded: 3,
    monthlyPrice: 49,
    displayOrder: 1,
    isActive: true,
  },
  {
    id: "tier-essential",
    slug: "essential",
    name: "Essential",
    description: "For regular butler service users",
    personalHoursIncluded: 15,
    virtualTasksIncluded: 8,
    monthlyPrice: 99,
    displayOrder: 2,
    isActive: true,
  },
  {
    id: "tier-heavy",
    slug: "heavy",
    name: "Heavy",
    description: "Maximum butler coverage for busy lifestyles",
    personalHoursIncluded: 30,
    virtualTasksIncluded: 15,
    monthlyPrice: 199,
    displayOrder: 3,
    isActive: true,
  },
];

export const VIRTUAL_TASK_CATEGORIES: { key: VirtualTaskCategory; label: string; description: string }[] = [
  { key: "appointment", label: "Appointment Booking", description: "Doctor, dentist, salon, spa, and other appointments" },
  { key: "taxi_airport", label: "Taxi & Airport", description: "Taxi bookings, airport transfers, and travel logistics" },
  { key: "restaurant", label: "Restaurant Reservation", description: "Table bookings and dining arrangements" },
  { key: "other", label: "Other Request", description: "Any other concierge task" },
];

export function getTierBySlug(slug: TierSlug): MembershipTier | undefined {
  return MEMBERSHIP_TIERS.find((t) => t.slug === slug);
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/data/__tests__/membership-config.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/data/membership-config.ts src/data/__tests__/membership-config.test.ts
git commit -m "feat: add membership tier config and virtual task categories"
```

---

## Task 3: Supabase Migration — Membership Tables

**Files:**
- Create: `src/supabase/migrations/003_membership_tables.sql`

**Step 1: Write the migration**

Create `src/supabase/migrations/003_membership_tables.sql`:
```sql
-- Membership tiers (config table, seeded)
CREATE TABLE IF NOT EXISTS membership_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL CHECK (slug IN ('lite', 'essential', 'heavy')),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  personal_hours_included INTEGER NOT NULL,
  virtual_tasks_included INTEGER NOT NULL,
  monthly_price NUMERIC(10,2) NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed tiers
INSERT INTO membership_tiers (slug, name, description, personal_hours_included, virtual_tasks_included, monthly_price, display_order) VALUES
  ('lite', 'Lite', 'Perfect for occasional butler needs', 5, 3, 49.00, 1),
  ('essential', 'Essential', 'For regular butler service users', 15, 8, 99.00, 2),
  ('heavy', 'Heavy', 'Maximum butler coverage for busy lifestyles', 30, 15, 199.00, 3);

-- Per-user membership (one active per user)
CREATE TABLE IF NOT EXISTS memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier_id UUID NOT NULL REFERENCES membership_tiers(id),
  personal_hours_total NUMERIC(5,1) NOT NULL DEFAULT 0,
  personal_hours_used NUMERIC(5,1) NOT NULL DEFAULT 0,
  virtual_tasks_total INTEGER NOT NULL DEFAULT 0,
  virtual_tasks_used INTEGER NOT NULL DEFAULT 0,
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT one_active_per_user UNIQUE (user_id) WHERE (status = 'active')
);

CREATE INDEX idx_memberships_user ON memberships(user_id);
CREATE INDEX idx_memberships_status ON memberships(status);

-- Virtual butler requests
CREATE TABLE IF NOT EXISTS virtual_butler_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  membership_id UUID NOT NULL REFERENCES memberships(id),
  reference TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('appointment', 'taxi_airport', 'restaurant', 'other')),
  description TEXT NOT NULL,
  preferred_date DATE,
  preferred_time TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_virtual_requests_user ON virtual_butler_requests(user_id);
CREATE INDEX idx_virtual_requests_membership ON virtual_butler_requests(membership_id);
CREATE INDEX idx_virtual_requests_status ON virtual_butler_requests(status);

-- RLS policies
ALTER TABLE membership_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE virtual_butler_requests ENABLE ROW LEVEL SECURITY;

-- Tiers: public read
CREATE POLICY "Anyone can read tiers"
  ON membership_tiers FOR SELECT USING (true);

-- Memberships: users read own, admins read/update all
CREATE POLICY "Users read own membership"
  ON memberships FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage memberships"
  ON memberships FOR ALL
  USING (auth.jwt() ->> 'email' IN ('rob@roberthayford.com', 'hello@butlersinc.com'));

-- Virtual requests: users read/insert own, admins manage all
CREATE POLICY "Users read own virtual requests"
  ON virtual_butler_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users create own virtual requests"
  ON virtual_butler_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage virtual requests"
  ON virtual_butler_requests FOR ALL
  USING (auth.jwt() ->> 'email' IN ('rob@roberthayford.com', 'hello@butlersinc.com'));
```

**Step 2: Commit**

```bash
git add src/supabase/migrations/003_membership_tables.sql
git commit -m "feat: add membership database tables and RLS policies"
```

Note: Apply this migration to Supabase via the SQL editor in the dashboard, same as previous migrations.

---

## Task 4: Membership Hook — `useMembership`

**Files:**
- Create: `src/hooks/useMembership.ts`
- Test: `src/hooks/__tests__/useMembership.test.tsx`

**Step 1: Write the failing test**

Create `src/hooks/__tests__/useMembership.test.tsx`:
```typescript
import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// Mock Supabase response
const mockMembership = {
  id: "mem-1",
  user_id: "user-1",
  tier_id: "tier-essential",
  personal_hours_total: 15,
  personal_hours_used: 7,
  virtual_tasks_total: 8,
  virtual_tasks_used: 3,
  billing_period_start: "2026-04-01",
  billing_period_end: "2026-04-30",
  status: "active",
  created_at: "2026-03-31T00:00:00Z",
  updated_at: "2026-03-31T00:00:00Z",
  membership_tiers: {
    id: "tier-essential",
    slug: "essential",
    name: "Essential",
    description: "Mid-tier",
    personal_hours_included: 15,
    virtual_tasks_included: 8,
    monthly_price: 99,
    display_order: 2,
    is_active: true,
  },
};

const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: mockMembership, error: null })),
        })),
      })),
    })),
  })),
};

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "user-1" },
    loading: false,
    supabase: mockSupabase,
  }),
}));

import { useMembership } from "../useMembership";

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useMembership", () => {
  it("returns membership data with tier info", async () => {
    const { result } = renderHook(() => useMembership(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.membership).toBeDefined();
    expect(result.current.membership?.tier.slug).toBe("essential");
    expect(result.current.personalHoursRemaining).toBe(8);
    expect(result.current.virtualTasksRemaining).toBe(5);
    expect(result.current.isMember).toBe(true);
  });

  it("returns isMember false when no membership", async () => {
    mockSupabase.from.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      }),
    });

    const { result } = renderHook(() => useMembership(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.membership).toBeNull();
    expect(result.current.isMember).toBe(false);
    expect(result.current.personalHoursRemaining).toBe(0);
    expect(result.current.virtualTasksRemaining).toBe(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/hooks/__tests__/useMembership.test.tsx`
Expected: FAIL — module not found

**Step 3: Write the hook**

Create `src/hooks/useMembership.ts`:
```typescript
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import type { Membership, MembershipTier } from "@/types/membership";

interface MembershipRow {
  id: string;
  user_id: string;
  tier_id: string;
  personal_hours_total: number;
  personal_hours_used: number;
  virtual_tasks_total: number;
  virtual_tasks_used: number;
  billing_period_start: string;
  billing_period_end: string;
  status: string;
  created_at: string;
  updated_at: string;
  membership_tiers: {
    id: string;
    slug: string;
    name: string;
    description: string;
    personal_hours_included: number;
    virtual_tasks_included: number;
    monthly_price: number;
    display_order: number;
    is_active: boolean;
  };
}

function toMembership(row: MembershipRow): Membership {
  return {
    id: row.id,
    userId: row.user_id,
    tierId: row.tier_id,
    tier: {
      id: row.membership_tiers.id,
      slug: row.membership_tiers.slug as MembershipTier["slug"],
      name: row.membership_tiers.name,
      description: row.membership_tiers.description,
      personalHoursIncluded: row.membership_tiers.personal_hours_included,
      virtualTasksIncluded: row.membership_tiers.virtual_tasks_included,
      monthlyPrice: row.membership_tiers.monthly_price,
      displayOrder: row.membership_tiers.display_order,
      isActive: row.membership_tiers.is_active,
    },
    personalHoursTotal: row.personal_hours_total,
    personalHoursUsed: row.personal_hours_used,
    virtualTasksTotal: row.virtual_tasks_total,
    virtualTasksUsed: row.virtual_tasks_used,
    billingPeriodStart: row.billing_period_start,
    billingPeriodEnd: row.billing_period_end,
    status: row.status as Membership["status"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function useMembership() {
  const { user, supabase } = useAuth();

  const { data: membership = null, isLoading } = useQuery({
    queryKey: ["membership", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("memberships")
        .select("*, membership_tiers(*)")
        .eq("user_id", user!.id)
        .eq("status", "active")
        .single();

      if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows
      if (!data) return null;
      return toMembership(data as MembershipRow);
    },
    enabled: !!user,
  });

  return {
    membership,
    isLoading,
    isMember: !!membership,
    personalHoursRemaining: membership
      ? membership.personalHoursTotal - membership.personalHoursUsed
      : 0,
    virtualTasksRemaining: membership
      ? membership.virtualTasksTotal - membership.virtualTasksUsed
      : 0,
  };
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/hooks/__tests__/useMembership.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/hooks/useMembership.ts src/hooks/__tests__/useMembership.test.tsx
git commit -m "feat: add useMembership hook with Supabase query"
```

---

## Task 5: UsageGauge Component

**Files:**
- Create: `src/components/membership/UsageGauge.tsx`
- Test: `src/components/membership/__tests__/UsageGauge.test.tsx`

**Step 1: Write the failing test**

Create `src/components/membership/__tests__/UsageGauge.test.tsx`:
```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@/test/test-utils";
import { UsageGauge } from "../UsageGauge";

describe("UsageGauge", () => {
  it("renders label, used/total, and unit", () => {
    render(<UsageGauge label="Hours" used={7} total={15} unit="hrs" />);
    expect(screen.getByText("Hours")).toBeInTheDocument();
    expect(screen.getByText("8 hrs remaining")).toBeInTheDocument();
  });

  it("renders progress bar at correct width", () => {
    const { container } = render(<UsageGauge label="Tasks" used={3} total={10} unit="tasks" />);
    const progressBar = container.querySelector("[data-testid='gauge-fill']");
    expect(progressBar).toHaveStyle({ width: "30%" });
  });

  it("shows warning style when nearly depleted", () => {
    const { container } = render(<UsageGauge label="Hours" used={14} total={15} unit="hrs" />);
    const progressBar = container.querySelector("[data-testid='gauge-fill']");
    expect(progressBar?.className).toContain("bg-amber");
  });

  it("shows depleted style when all used", () => {
    const { container } = render(<UsageGauge label="Tasks" used={5} total={5} unit="tasks" />);
    const progressBar = container.querySelector("[data-testid='gauge-fill']");
    expect(progressBar?.className).toContain("bg-red");
  });

  it("handles zero total gracefully", () => {
    render(<UsageGauge label="Hours" used={0} total={0} unit="hrs" />);
    expect(screen.getByText("0 hrs remaining")).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/components/membership/__tests__/UsageGauge.test.tsx`
Expected: FAIL

**Step 3: Write the component**

Create `src/components/membership/UsageGauge.tsx`:
```typescript
interface UsageGaugeProps {
  label: string;
  used: number;
  total: number;
  unit: string;
}

export function UsageGauge({ label, used, total, unit }: UsageGaugeProps) {
  const remaining = Math.max(0, total - used);
  const percentage = total > 0 ? (used / total) * 100 : 0;

  const fillColor =
    percentage >= 100
      ? "bg-red-500"
      : percentage >= 80
        ? "bg-amber-500"
        : "bg-brass";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-warm-gray">{label}</span>
        <span className="text-optical-white font-medium">
          {remaining} {unit} remaining
        </span>
      </div>
      <div className="h-2 bg-primary-foreground/10 rounded-sm overflow-hidden">
        <div
          data-testid="gauge-fill"
          className={`h-full rounded-sm transition-all ${fillColor}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/components/membership/__tests__/UsageGauge.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/membership/UsageGauge.tsx src/components/membership/__tests__/UsageGauge.test.tsx
git commit -m "feat: add UsageGauge progress bar component"
```

---

## Task 6: TierBadge Component

**Files:**
- Create: `src/components/membership/TierBadge.tsx`
- Test: `src/components/membership/__tests__/TierBadge.test.tsx`

**Step 1: Write the failing test**

Create `src/components/membership/__tests__/TierBadge.test.tsx`:
```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@/test/test-utils";
import { TierBadge } from "../TierBadge";

describe("TierBadge", () => {
  it("renders tier name", () => {
    render(<TierBadge tier="lite" />);
    expect(screen.getByText("Lite")).toBeInTheDocument();
  });

  it("renders essential tier", () => {
    render(<TierBadge tier="essential" />);
    expect(screen.getByText("Essential")).toBeInTheDocument();
  });

  it("renders heavy tier", () => {
    render(<TierBadge tier="heavy" />);
    expect(screen.getByText("Heavy")).toBeInTheDocument();
  });

  it("applies size variant", () => {
    const { container } = render(<TierBadge tier="heavy" size="lg" />);
    expect(container.firstChild).toHaveClass("text-sm");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/components/membership/__tests__/TierBadge.test.tsx`
Expected: FAIL

**Step 3: Write the component**

Create `src/components/membership/TierBadge.tsx`:
```typescript
import type { TierSlug } from "@/types/membership";

const TIER_STYLES: Record<TierSlug, string> = {
  lite: "bg-zinc-700/50 text-zinc-300 border-zinc-600",
  essential: "bg-brass/20 text-brass-text border-brass/40",
  heavy: "bg-amber-900/30 text-amber-300 border-amber-700/40",
};

const TIER_LABELS: Record<TierSlug, string> = {
  lite: "Lite",
  essential: "Essential",
  heavy: "Heavy",
};

interface TierBadgeProps {
  tier: TierSlug;
  size?: "sm" | "lg";
}

export function TierBadge({ tier, size = "sm" }: TierBadgeProps) {
  const sizeClass = size === "lg" ? "text-sm px-3 py-1" : "text-xs px-2 py-0.5";

  return (
    <span
      className={`inline-flex items-center font-medium border rounded-sm ${sizeClass} ${TIER_STYLES[tier]}`}
    >
      {TIER_LABELS[tier]}
    </span>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/components/membership/__tests__/TierBadge.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/membership/TierBadge.tsx src/components/membership/__tests__/TierBadge.test.tsx
git commit -m "feat: add TierBadge component"
```

---

## Task 7: Member Dashboard — Two-Card Chooser

**Files:**
- Modify: `src/app/members/dashboard/page.tsx`
- Test: `src/app/members/__tests__/dashboard.test.tsx` (update existing)

**Step 1: Update the test file**

Replace `src/app/members/__tests__/dashboard.test.tsx` with:
```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@/test/test-utils";
import MemberDashboard from "../dashboard/page";

// Default: member with active membership
const mockMembershipData = {
  membership: {
    id: "mem-1",
    userId: "user-1",
    tierId: "tier-essential",
    tier: {
      id: "tier-essential",
      slug: "essential",
      name: "Essential",
      description: "Mid-tier",
      personalHoursIncluded: 15,
      virtualTasksIncluded: 8,
      monthlyPrice: 99,
      displayOrder: 2,
      isActive: true,
    },
    personalHoursTotal: 15,
    personalHoursUsed: 7,
    virtualTasksTotal: 8,
    virtualTasksUsed: 3,
    billingPeriodStart: "2026-04-01",
    billingPeriodEnd: "2026-04-30",
    status: "active" as const,
    createdAt: "2026-03-31T00:00:00Z",
    updatedAt: "2026-03-31T00:00:00Z",
  },
  isLoading: false,
  isMember: true,
  personalHoursRemaining: 8,
  virtualTasksRemaining: 5,
};

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "test@example.com", user_metadata: { name: "Jane" } },
    loading: false,
    signOut: vi.fn(),
    supabase: {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
      }),
    },
  }),
}));

vi.mock("@/hooks/useMembership", () => ({
  useMembership: () => mockMembershipData,
}));

describe("MemberDashboard", () => {
  it("shows welcome message with user name", async () => {
    render(<MemberDashboard />);
    expect(await screen.findByText(/Welcome back, Jane/)).toBeInTheDocument();
  });

  it("shows tier badge for members", async () => {
    render(<MemberDashboard />);
    expect(await screen.findByText("Essential")).toBeInTheDocument();
  });

  it("renders Personal Butler card with hours remaining", async () => {
    render(<MemberDashboard />);
    expect(await screen.findByText("Personal Butler")).toBeInTheDocument();
    expect(screen.getByText(/8 hrs remaining/)).toBeInTheDocument();
  });

  it("renders Virtual Butler card with tasks remaining", async () => {
    render(<MemberDashboard />);
    expect(await screen.findByText("Virtual Butler")).toBeInTheDocument();
    expect(screen.getByText(/5 tasks remaining/)).toBeInTheDocument();
  });

  it("links Personal Butler card to /members/personal-butler", async () => {
    render(<MemberDashboard />);
    const link = await screen.findByRole("link", { name: /Personal Butler/i });
    expect(link).toHaveAttribute("href", "/members/personal-butler");
  });

  it("links Virtual Butler card to /members/virtual-butler", async () => {
    render(<MemberDashboard />);
    const link = await screen.findByRole("link", { name: /Virtual Butler/i });
    expect(link).toHaveAttribute("href", "/members/virtual-butler");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/app/members/__tests__/dashboard.test.tsx`
Expected: FAIL — component doesn't render new elements yet

**Step 3: Rewrite the dashboard page**

Replace `src/app/members/dashboard/page.tsx` with:
```typescript
"use client";

import { useAuth } from "@/context/AuthContext";
import { useMembership } from "@/hooks/useMembership";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { services } from "@/data/services";
import { DAY_OPTIONS, TIME_SLOTS } from "@/data/booking-config";
import { format } from "date-fns";
import { TierBadge } from "@/components/membership/TierBadge";
import { UsageGauge } from "@/components/membership/UsageGauge";

const BUTLER_LABELS = Object.fromEntries(services.map((s) => [s.id, s.name]));
const DAY_LABELS = Object.fromEntries(DAY_OPTIONS.map((d) => [d.key, d.label]));
const TIME_LABELS = Object.fromEntries(TIME_SLOTS.map((t) => [t.key, t.label]));

interface Booking {
  id: string;
  butler_type: string;
  service_option: string | null;
  day_option: string;
  time_slot: string;
  reference: string;
  status: string;
  created_at: string;
}

export default function MemberDashboard() {
  const { user, loading, signOut, supabase } = useAuth();
  const { membership, isLoading: memberLoading, isMember, personalHoursRemaining, virtualTasksRemaining } = useMembership();
  const router = useRouter();

  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ["bookings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Booking[];
    },
    enabled: !!user,
  });

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  if (loading || memberLoading) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <p className="text-warm-gray">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-charcoal">
      <header className="border-b border-primary-foreground/10 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-serif font-bold text-optical-white">
          Butlers Inc.
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-warm-gray text-sm">
            {user?.user_metadata?.name ?? user?.email}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            className="border-primary-foreground/20 text-optical-white hover:bg-primary-foreground/10"
          >
            Sign Out
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Welcome + Tier */}
        <div className="flex items-center gap-3 mb-8">
          <h1 className="text-3xl font-serif font-bold text-optical-white tracking-tight">
            Welcome back, {user?.user_metadata?.name ?? "Member"}
          </h1>
          {isMember && membership && <TierBadge tier={membership.tier.slug} size="lg" />}
        </div>

        {/* Two-card chooser (members only) */}
        {isMember && membership ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {/* Personal Butler Card */}
            <Link
              href="/members/personal-butler"
              className="block bg-primary-foreground/5 border border-primary-foreground/10 rounded-sm p-6 hover:border-brass/40 transition-colors"
            >
              <h2 className="text-xl font-serif font-semibold text-optical-white mb-4">
                Personal Butler
              </h2>
              <p className="text-warm-gray text-sm mb-4">
                Book butler services at your member rate
              </p>
              <UsageGauge
                label="Hours"
                used={membership.personalHoursUsed}
                total={membership.personalHoursTotal}
                unit="hrs"
              />
            </Link>

            {/* Virtual Butler Card */}
            <Link
              href="/members/virtual-butler"
              className="block bg-primary-foreground/5 border border-primary-foreground/10 rounded-sm p-6 hover:border-brass/40 transition-colors"
            >
              <h2 className="text-xl font-serif font-semibold text-optical-white mb-4">
                Virtual Butler
              </h2>
              <p className="text-warm-gray text-sm mb-4">
                Appointments, taxis, reservations and more
              </p>
              <UsageGauge
                label="Tasks"
                used={membership.virtualTasksUsed}
                total={membership.virtualTasksTotal}
                unit="tasks"
              />
            </Link>
          </div>
        ) : (
          <div className="bg-primary-foreground/5 border border-primary-foreground/10 rounded-sm p-8 text-center mb-12">
            <p className="text-optical-white font-serif text-lg mb-2">Become a Member</p>
            <p className="text-warm-gray text-sm mb-4">
              Get discounted butler rates and virtual concierge tasks with a membership.
            </p>
            <Link href="/butlers">
              <Button className="bg-brass text-charcoal hover:bg-brass-muted">
                View Butler Services
              </Button>
            </Link>
          </div>
        )}

        {/* Booking History (kept for all users) */}
        <section>
          <h2 className="text-xl font-serif font-semibold text-optical-white mb-4">
            Booking History
          </h2>

          {bookingsLoading ? (
            <p className="text-warm-gray">Loading bookings...</p>
          ) : !bookings?.length ? (
            <div className="bg-primary-foreground/5 border border-primary-foreground/10 rounded-sm p-8 text-center">
              <p className="text-warm-gray mb-4">No bookings yet.</p>
              <Link href="/">
                <Button className="bg-brass text-charcoal hover:bg-brass-muted">
                  Book a Butler
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="bg-primary-foreground/5 border border-primary-foreground/10 rounded-sm p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="text-optical-white font-medium">
                      {BUTLER_LABELS[booking.butler_type] ?? booking.butler_type} &mdash; {booking.reference}
                    </p>
                    <p className="text-warm-gray text-sm">
                      {booking.service_option ?? "Custom request"} &bull;{" "}
                      {DAY_LABELS[booking.day_option] ?? booking.day_option} &bull;{" "}
                      {TIME_LABELS[booking.time_slot] ?? booking.time_slot}
                    </p>
                    <p className="text-warm-gray text-xs mt-0.5">
                      {format(new Date(booking.created_at), "d MMM yyyy")}
                    </p>
                  </div>
                  <span className="text-xs font-medium px-2 py-1 rounded bg-brass/20 text-brass-text">
                    {booking.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/app/members/__tests__/dashboard.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/members/dashboard/page.tsx src/app/members/__tests__/dashboard.test.tsx
git commit -m "feat: add two-card member dashboard with usage gauges"
```

---

## Task 8: Personal Butler Page

**Files:**
- Create: `src/app/members/personal-butler/page.tsx`
- Test: `src/app/members/__tests__/personal-butler.test.tsx`

**Step 1: Write the failing test**

Create `src/app/members/__tests__/personal-butler.test.tsx`:
```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@/test/test-utils";
import PersonalButlerPage from "../personal-butler/page";

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "test@example.com", user_metadata: { name: "Jane" } },
    loading: false,
    signOut: vi.fn(),
    supabase: { from: vi.fn() },
  }),
}));

vi.mock("@/hooks/useMembership", () => ({
  useMembership: () => ({
    membership: {
      id: "mem-1",
      tier: { slug: "essential", name: "Essential" },
      personalHoursTotal: 15,
      personalHoursUsed: 7,
      billingPeriodStart: "2026-04-01",
      billingPeriodEnd: "2026-04-30",
    },
    isLoading: false,
    isMember: true,
    personalHoursRemaining: 8,
    virtualTasksRemaining: 5,
  }),
}));

// Mock BookingFlow since it has its own tests
vi.mock("@/components/booking/BookingFlow", () => ({
  BookingFlow: ({ butlerType }: { butlerType: string }) => (
    <div data-testid="booking-flow">BookingFlow:{butlerType}</div>
  ),
}));

describe("PersonalButlerPage", () => {
  it("shows tier badge and hours remaining", async () => {
    render(<PersonalButlerPage />);
    expect(await screen.findByText("Essential")).toBeInTheDocument();
    expect(screen.getByText(/8 hrs remaining/)).toBeInTheDocument();
  });

  it("shows billing period", async () => {
    render(<PersonalButlerPage />);
    expect(await screen.findByText(/1 Apr.*30 Apr 2026/)).toBeInTheDocument();
  });

  it("renders all 5 butler service options", async () => {
    render(<PersonalButlerPage />);
    expect(await screen.findByText("Base Butler")).toBeInTheDocument();
    expect(screen.getByText("Baby Butler")).toBeInTheDocument();
    expect(screen.getByText("Bougie Butler")).toBeInTheDocument();
    expect(screen.getByText("Busy Butler")).toBeInTheDocument();
    expect(screen.getByText("Bespoke Butler")).toBeInTheDocument();
  });

  it("shows member pricing for self-service butlers", async () => {
    render(<PersonalButlerPage />);
    // All self-service butlers show £35/hr for members
    const priceLabels = await screen.findAllByText("£35/hr");
    expect(priceLabels.length).toBeGreaterThanOrEqual(3); // base, baby, busy (budget already £35)
  });

  it("shows booking flow when a butler is selected", async () => {
    render(<PersonalButlerPage />);
    const baseButton = await screen.findByRole("button", { name: /Base Butler/i });
    baseButton.click();
    expect(await screen.findByTestId("booking-flow")).toBeInTheDocument();
    expect(screen.getByText("BookingFlow:base")).toBeInTheDocument();
  });

  it("has a back link to dashboard", async () => {
    render(<PersonalButlerPage />);
    const backLink = await screen.findByRole("link", { name: /Back to Dashboard/i });
    expect(backLink).toHaveAttribute("href", "/members/dashboard");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/app/members/__tests__/personal-butler.test.tsx`
Expected: FAIL

**Step 3: Write the page**

Create `src/app/members/personal-butler/page.tsx`:
```typescript
"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useMembership } from "@/hooks/useMembership";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { TierBadge } from "@/components/membership/TierBadge";
import { UsageGauge } from "@/components/membership/UsageGauge";
import { BookingFlow } from "@/components/booking/BookingFlow";
import { services } from "@/data/services";
import { BUTLER_PRICING } from "@/data/pricing-config";
import { MEMBER_HOURLY_RATE } from "@/data/membership-config";
import type { ButlerTypeKey } from "@/data/butler-tasks";

export default function PersonalButlerPage() {
  const { user, loading } = useAuth();
  const { membership, isLoading: memberLoading, isMember } = useMembership();
  const router = useRouter();
  const [selectedButler, setSelectedButler] = useState<ButlerTypeKey | null>(null);

  if (loading || memberLoading) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <p className="text-warm-gray">Loading...</p>
      </div>
    );
  }

  if (!isMember || !membership) {
    router.push("/members/dashboard");
    return null;
  }

  const hoursRemaining = membership.personalHoursTotal - membership.personalHoursUsed;

  return (
    <div className="min-h-screen bg-charcoal">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Back nav */}
        <Link
          href="/members/dashboard"
          className="text-warm-gray text-sm hover:text-optical-white transition-colors mb-6 inline-block"
        >
          &larr; Back to Dashboard
        </Link>

        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-serif font-bold text-optical-white tracking-tight">
            Personal Butler
          </h1>
          <TierBadge tier={membership.tier.slug} size="lg" />
        </div>
        <p className="text-warm-gray text-sm mb-6">
          {format(new Date(membership.billingPeriodStart), "d MMM")} &ndash;{" "}
          {format(new Date(membership.billingPeriodEnd), "d MMM yyyy")}
        </p>

        {/* Hours gauge */}
        <div className="mb-8">
          <UsageGauge
            label="Butler Hours"
            used={membership.personalHoursUsed}
            total={membership.personalHoursTotal}
            unit="hrs"
          />
        </div>

        {/* Butler selection or booking flow */}
        {selectedButler ? (
          <div>
            <button
              onClick={() => setSelectedButler(null)}
              className="text-warm-gray text-sm hover:text-optical-white transition-colors mb-4"
            >
              &larr; Choose a different butler
            </button>
            <BookingFlow butlerType={selectedButler} />
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-serif font-semibold text-optical-white mb-4">
              Choose Your Butler
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map((service) => {
                const pricing = BUTLER_PRICING[service.id as ButlerTypeKey];
                const isSelfService = pricing?.bookingType === "self_service";
                const memberPrice = isSelfService ? MEMBER_HOURLY_RATE : pricing?.hourlyRate;
                const priceLabel = isSelfService ? `£${memberPrice}/hr` : "Consultation";

                return (
                  <button
                    key={service.id}
                    onClick={() => setSelectedButler(service.id as ButlerTypeKey)}
                    className="bg-primary-foreground/5 border border-primary-foreground/10 rounded-sm p-4 text-left hover:border-brass/40 transition-colors"
                  >
                    <p className="text-optical-white font-medium mb-1">{service.name}</p>
                    <p className="text-warm-gray text-sm mb-2">{service.subtitle}</p>
                    <p className="text-brass-text text-sm font-medium">{priceLabel}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/app/members/__tests__/personal-butler.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/members/personal-butler/page.tsx src/app/members/__tests__/personal-butler.test.tsx
git commit -m "feat: add Personal Butler page with tier info and butler picker"
```

---

## Task 9: Virtual Butler Request Form

**Files:**
- Create: `src/components/membership/VirtualRequestForm.tsx`
- Test: `src/components/membership/__tests__/VirtualRequestForm.test.tsx`

**Step 1: Write the failing test**

Create `src/components/membership/__tests__/VirtualRequestForm.test.tsx`:
```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@/test/test-utils";
import { VirtualRequestForm } from "../VirtualRequestForm";

describe("VirtualRequestForm", () => {
  const onSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders category selector with all options", () => {
    render(<VirtualRequestForm onSubmit={onSubmit} isSubmitting={false} />);
    expect(screen.getByLabelText(/Category/i)).toBeInTheDocument();
    expect(screen.getByText("Appointment Booking")).toBeInTheDocument();
    expect(screen.getByText("Taxi & Airport")).toBeInTheDocument();
    expect(screen.getByText("Restaurant Reservation")).toBeInTheDocument();
    expect(screen.getByText("Other Request")).toBeInTheDocument();
  });

  it("renders description textarea", () => {
    render(<VirtualRequestForm onSubmit={onSubmit} isSubmitting={false} />);
    expect(screen.getByLabelText(/What do you need/i)).toBeInTheDocument();
  });

  it("renders optional date and time fields", () => {
    render(<VirtualRequestForm onSubmit={onSubmit} isSubmitting={false} />);
    expect(screen.getByLabelText(/Preferred Date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Preferred Time/i)).toBeInTheDocument();
  });

  it("disables submit when description is empty", () => {
    render(<VirtualRequestForm onSubmit={onSubmit} isSubmitting={false} />);
    const submitBtn = screen.getByRole("button", { name: /Submit Request/i });
    expect(submitBtn).toBeDisabled();
  });

  it("calls onSubmit with form data", async () => {
    render(<VirtualRequestForm onSubmit={onSubmit} isSubmitting={false} />);

    // Select category
    fireEvent.click(screen.getByText("Taxi & Airport"));

    // Fill description
    fireEvent.change(screen.getByLabelText(/What do you need/i), {
      target: { value: "Airport pickup from Heathrow T5 at 3pm" },
    });

    // Submit
    const submitBtn = screen.getByRole("button", { name: /Submit Request/i });
    fireEvent.click(submitBtn);

    expect(onSubmit).toHaveBeenCalledWith({
      category: "taxi_airport",
      description: "Airport pickup from Heathrow T5 at 3pm",
      preferredDate: "",
      preferredTime: "",
    });
  });

  it("shows submitting state", () => {
    render(<VirtualRequestForm onSubmit={onSubmit} isSubmitting={true} />);
    expect(screen.getByRole("button", { name: /Submitting/i })).toBeDisabled();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/components/membership/__tests__/VirtualRequestForm.test.tsx`
Expected: FAIL

**Step 3: Write the component**

Create `src/components/membership/VirtualRequestForm.tsx`:
```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { VIRTUAL_TASK_CATEGORIES } from "@/data/membership-config";
import type { VirtualTaskCategory } from "@/types/membership";

interface VirtualRequestFormData {
  category: VirtualTaskCategory;
  description: string;
  preferredDate: string;
  preferredTime: string;
}

interface VirtualRequestFormProps {
  onSubmit: (data: VirtualRequestFormData) => void;
  isSubmitting: boolean;
}

export function VirtualRequestForm({ onSubmit, isSubmitting }: VirtualRequestFormProps) {
  const [category, setCategory] = useState<VirtualTaskCategory>("appointment");
  const [description, setDescription] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");

  const canSubmit = description.trim().length > 0 && !isSubmitting;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({ category, description, preferredDate, preferredTime });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Category selector */}
      <div>
        <label className="block text-sm font-medium text-optical-white mb-2">Category</label>
        <div className="grid grid-cols-2 gap-2">
          {VIRTUAL_TASK_CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setCategory(cat.key)}
              className={`p-3 rounded-sm border text-left transition-colors ${
                category === cat.key
                  ? "border-brass/60 bg-brass/10 text-optical-white"
                  : "border-primary-foreground/10 bg-primary-foreground/5 text-warm-gray hover:border-primary-foreground/20"
              }`}
            >
              <p className="text-sm font-medium">{cat.label}</p>
              <p className="text-xs mt-0.5 opacity-70">{cat.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="vb-description" className="block text-sm font-medium text-optical-white mb-1">
          What do you need?
        </label>
        <textarea
          id="vb-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="Describe what you need your virtual butler to do..."
          className="w-full bg-primary-foreground/5 border border-primary-foreground/10 rounded-sm p-3 text-optical-white placeholder:text-warm-gray/50 focus:border-brass/40 focus:outline-none"
        />
      </div>

      {/* Date and Time (optional) */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="vb-date" className="block text-sm font-medium text-optical-white mb-1">
            Preferred Date
          </label>
          <input
            id="vb-date"
            type="date"
            value={preferredDate}
            onChange={(e) => setPreferredDate(e.target.value)}
            className="w-full bg-primary-foreground/5 border border-primary-foreground/10 rounded-sm p-2 text-optical-white focus:border-brass/40 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="vb-time" className="block text-sm font-medium text-optical-white mb-1">
            Preferred Time
          </label>
          <input
            id="vb-time"
            type="time"
            value={preferredTime}
            onChange={(e) => setPreferredTime(e.target.value)}
            className="w-full bg-primary-foreground/5 border border-primary-foreground/10 rounded-sm p-2 text-optical-white focus:border-brass/40 focus:outline-none"
          />
        </div>
      </div>

      {/* Submit */}
      <Button
        type="submit"
        disabled={!canSubmit}
        className="w-full bg-brass text-charcoal hover:bg-brass-muted disabled:opacity-50"
      >
        {isSubmitting ? "Submitting..." : "Submit Request"}
      </Button>
    </form>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/components/membership/__tests__/VirtualRequestForm.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/membership/VirtualRequestForm.tsx src/components/membership/__tests__/VirtualRequestForm.test.tsx
git commit -m "feat: add VirtualRequestForm component"
```

---

## Task 10: Virtual Butler API Route

**Files:**
- Create: `src/app/api/virtual-butler/route.ts`
- Test: `src/app/api/__tests__/virtual-butler.test.ts`

**Step 1: Write the failing test**

Create `src/app/api/__tests__/virtual-butler.test.ts`:
```typescript
import { describe, it, expect, vi } from "vitest";
import { generateReference } from "../virtual-butler/route";

describe("Virtual Butler API helpers", () => {
  it("generateReference produces VB-XXXXX format", () => {
    const ref = generateReference();
    expect(ref).toMatch(/^VB-[A-Z0-9]{5}$/);
  });

  it("generates unique references", () => {
    const refs = new Set(Array.from({ length: 100 }, () => generateReference()));
    expect(refs.size).toBe(100);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/app/api/__tests__/virtual-butler.test.ts`
Expected: FAIL

**Step 3: Write the API route**

Create `src/app/api/virtual-butler/route.ts`:
```typescript
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
    // Get auth token from request
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { category, description, preferredDate, preferredTime, membershipId } = body;

    if (!category || !description || !membershipId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify membership is active and belongs to user
    const { data: membership, error: memError } = await supabaseAdmin
      .from("memberships")
      .select("id, virtual_tasks_total, virtual_tasks_used")
      .eq("id", membershipId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (memError || !membership) {
      return NextResponse.json({ error: "Active membership required" }, { status: 403 });
    }

    // Check task allowance
    if (membership.virtual_tasks_used >= membership.virtual_tasks_total) {
      return NextResponse.json({ error: "No remaining virtual tasks" }, { status: 403 });
    }

    const reference = generateReference();

    // Insert request + increment usage in a transaction-like pattern
    const { data: request_data, error: insertError } = await supabaseAdmin
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

    // Increment virtual_tasks_used
    const { error: updateError } = await supabaseAdmin
      .from("memberships")
      .update({ virtual_tasks_used: membership.virtual_tasks_used + 1, updated_at: new Date().toISOString() })
      .eq("id", membershipId);

    if (updateError) throw updateError;

    return NextResponse.json({ reference, request: request_data });
  } catch (error) {
    console.error("Virtual butler request failed:", error);
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/app/api/__tests__/virtual-butler.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/api/virtual-butler/route.ts src/app/api/__tests__/virtual-butler.test.ts
git commit -m "feat: add virtual butler request API route"
```

---

## Task 11: Virtual Butler Page

**Files:**
- Create: `src/app/members/virtual-butler/page.tsx`
- Test: `src/app/members/__tests__/virtual-butler.test.tsx`

**Step 1: Write the failing test**

Create `src/app/members/__tests__/virtual-butler.test.tsx`:
```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@/test/test-utils";
import VirtualButlerPage from "../virtual-butler/page";

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "test@example.com", user_metadata: { name: "Jane" } },
    loading: false,
    supabase: {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
      }),
    },
    session: { access_token: "mock-token" },
  }),
}));

vi.mock("@/hooks/useMembership", () => ({
  useMembership: () => ({
    membership: {
      id: "mem-1",
      tier: { slug: "essential", name: "Essential" },
      virtualTasksTotal: 8,
      virtualTasksUsed: 3,
      billingPeriodStart: "2026-04-01",
      billingPeriodEnd: "2026-04-30",
    },
    isLoading: false,
    isMember: true,
    virtualTasksRemaining: 5,
  }),
}));

describe("VirtualButlerPage", () => {
  it("shows tasks remaining gauge", async () => {
    render(<VirtualButlerPage />);
    expect(await screen.findByText(/5 tasks remaining/)).toBeInTheDocument();
  });

  it("shows billing period", async () => {
    render(<VirtualButlerPage />);
    expect(await screen.findByText(/1 Apr.*30 Apr 2026/)).toBeInTheDocument();
  });

  it("renders the request form", async () => {
    render(<VirtualButlerPage />);
    expect(await screen.findByText("Appointment Booking")).toBeInTheDocument();
    expect(screen.getByLabelText(/What do you need/i)).toBeInTheDocument();
  });

  it("shows request history section", async () => {
    render(<VirtualButlerPage />);
    expect(await screen.findByText(/Request History/i)).toBeInTheDocument();
  });

  it("has a back link to dashboard", async () => {
    render(<VirtualButlerPage />);
    const backLink = await screen.findByRole("link", { name: /Back to Dashboard/i });
    expect(backLink).toHaveAttribute("href", "/members/dashboard");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/app/members/__tests__/virtual-butler.test.tsx`
Expected: FAIL

**Step 3: Write the page**

Create `src/app/members/virtual-butler/page.tsx`:
```typescript
"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useMembership } from "@/hooks/useMembership";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import { TierBadge } from "@/components/membership/TierBadge";
import { UsageGauge } from "@/components/membership/UsageGauge";
import { VirtualRequestForm } from "@/components/membership/VirtualRequestForm";
import type { VirtualButlerRequest, VirtualTaskCategory } from "@/types/membership";

const CATEGORY_LABELS: Record<VirtualTaskCategory, string> = {
  appointment: "Appointment Booking",
  taxi_airport: "Taxi & Airport",
  restaurant: "Restaurant Reservation",
  other: "Other Request",
};

export default function VirtualButlerPage() {
  const { user, loading, supabase, session } = useAuth();
  const { membership, isLoading: memberLoading, isMember, virtualTasksRemaining } = useMembership();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: requests = [], isLoading: requestsLoading } = useQuery({
    queryKey: ["virtual-requests", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("virtual_butler_requests")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as VirtualButlerRequest[];
    },
    enabled: !!user,
  });

  const handleSubmit = async (data: {
    category: VirtualTaskCategory;
    description: string;
    preferredDate: string;
    preferredTime: string;
  }) => {
    if (!membership || !session) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/virtual-butler", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          ...data,
          membershipId: membership.id,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Request failed");
      }

      const result = await res.json();
      toast.success(`Request submitted! Reference: ${result.reference}`);

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["virtual-requests"] });
      queryClient.invalidateQueries({ queryKey: ["membership"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || memberLoading) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <p className="text-warm-gray">Loading...</p>
      </div>
    );
  }

  if (!isMember || !membership) {
    router.push("/members/dashboard");
    return null;
  }

  return (
    <div className="min-h-screen bg-charcoal">
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Back nav */}
        <Link
          href="/members/dashboard"
          className="text-warm-gray text-sm hover:text-optical-white transition-colors mb-6 inline-block"
        >
          &larr; Back to Dashboard
        </Link>

        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-serif font-bold text-optical-white tracking-tight">
            Virtual Butler
          </h1>
          <TierBadge tier={membership.tier.slug} size="lg" />
        </div>
        <p className="text-warm-gray text-sm mb-6">
          {format(new Date(membership.billingPeriodStart), "d MMM")} &ndash;{" "}
          {format(new Date(membership.billingPeriodEnd), "d MMM yyyy")}
        </p>

        {/* Tasks gauge */}
        <div className="mb-8">
          <UsageGauge
            label="Virtual Tasks"
            used={membership.virtualTasksUsed}
            total={membership.virtualTasksTotal}
            unit="tasks"
          />
        </div>

        {/* Request form */}
        {virtualTasksRemaining > 0 ? (
          <div className="mb-12">
            <h2 className="text-xl font-serif font-semibold text-optical-white mb-4">
              New Request
            </h2>
            <VirtualRequestForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
          </div>
        ) : (
          <div className="bg-primary-foreground/5 border border-primary-foreground/10 rounded-sm p-6 text-center mb-12">
            <p className="text-optical-white mb-2">All virtual tasks used this period</p>
            <p className="text-warm-gray text-sm">
              Your tasks reset on {format(new Date(membership.billingPeriodEnd), "d MMMM yyyy")}.
            </p>
          </div>
        )}

        {/* Request history */}
        <section>
          <h2 className="text-xl font-serif font-semibold text-optical-white mb-4">
            Request History
          </h2>

          {requestsLoading ? (
            <p className="text-warm-gray">Loading requests...</p>
          ) : !requests.length ? (
            <p className="text-warm-gray text-sm">No virtual butler requests yet.</p>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="bg-primary-foreground/5 border border-primary-foreground/10 rounded-sm p-4"
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-optical-white font-medium text-sm">
                      {CATEGORY_LABELS[req.category]} &mdash; {req.reference}
                    </p>
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-brass/20 text-brass-text">
                      {req.status}
                    </span>
                  </div>
                  <p className="text-warm-gray text-sm line-clamp-2">{req.description}</p>
                  <p className="text-warm-gray text-xs mt-1">
                    {format(new Date(req.createdAt), "d MMM yyyy")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/app/members/__tests__/virtual-butler.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/members/virtual-butler/page.tsx src/app/members/__tests__/virtual-butler.test.tsx
git commit -m "feat: add Virtual Butler page with request form and history"
```

---

## Task 12: Run Full Test Suite

**Step 1: Run all tests**

Run: `npm run test:run`
Expected: All existing tests still pass, plus ~25 new tests from Tasks 1-11

**Step 2: Fix any regressions**

If any existing tests fail due to the dashboard refactor (Task 7), update them to account for the `useMembership` mock.

**Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve test regressions from membership integration"
```

---

## Task 13: Visual Polish and Manual Testing

**Step 1: Start dev server**

Run: `npm run dev`

**Step 2: Manual verification checklist**

- [ ] `/members/login` → sign in → redirects to `/members/dashboard`
- [ ] Dashboard shows two cards for members (requires a membership row in Supabase)
- [ ] Dashboard shows upgrade prompt for non-members
- [ ] Personal Butler card links to `/members/personal-butler`
- [ ] Virtual Butler card links to `/members/virtual-butler`
- [ ] Personal Butler page shows tier, hours gauge, 5 butler options
- [ ] Clicking a butler opens the existing BookingFlow
- [ ] Virtual Butler page shows tasks gauge and request form
- [ ] Submitting a virtual request creates a row and updates task count
- [ ] Request history shows previous requests
- [ ] Back links work on both pages
- [ ] Mobile responsive: cards stack, form is usable

**Step 3: Apply frontend-design skill for polish**

Use the `/frontend-design` skill to review and polish the visual design of the three new pages. Focus on:
- Card hover states and transitions
- Typography hierarchy
- Mobile layout
- Empty states
- Loading states

**Step 4: Commit polish changes**

```bash
git add -A
git commit -m "style: polish membership pages"
```

---

## Summary

| Task | What | New Tests |
|------|------|-----------|
| 1 | Membership types | 4 |
| 2 | Tier config data | 6 |
| 3 | Database migration | 0 (SQL) |
| 4 | useMembership hook | 2 |
| 5 | UsageGauge component | 5 |
| 6 | TierBadge component | 4 |
| 7 | Dashboard refactor | 6 |
| 8 | Personal Butler page | 6 |
| 9 | VirtualRequestForm | 6 |
| 10 | Virtual Butler API | 2 |
| 11 | Virtual Butler page | 5 |
| 12 | Full test suite run | 0 |
| 13 | Visual polish | 0 |
| **Total** | | **~46 new tests** |
