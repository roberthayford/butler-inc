import { describe, it, expect, vi, beforeEach } from "vitest";
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

const singleFn = vi.fn(() => Promise.resolve({ data: mockMembership, error: null }));

const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: singleFn,
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
  beforeEach(() => {
    vi.clearAllMocks();
    singleFn.mockResolvedValue({ data: mockMembership, error: null });
  });

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
    singleFn.mockResolvedValueOnce({ data: null, error: { code: "PGRST116", message: "no rows" } });

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
