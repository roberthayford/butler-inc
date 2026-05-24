import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "user-1" },
    loading: false,
    supabase: {},
  }),
}));

import { useMembership } from "../useMembership";

function buildMockMembership(overrides: Partial<{
  billing_period_start: string;
  billing_period_end: string;
  personal_hours_used: number;
  virtual_tasks_used: number;
}> = {}) {
  return {
    id: "mem-1",
    user_id: "user-1",
    tier_id: "tier-essential",
    personal_hours_total: 15,
    personal_hours_used: 7,
    virtual_tasks_total: 8,
    virtual_tasks_used: 3,
    billing_period_start: "2026-05-01",
    billing_period_end: "2026-05-31",
    status: "active",
    created_at: "2026-04-30T00:00:00Z",
    updated_at: "2026-04-30T00:00:00Z",
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
    ...overrides,
  };
}

const originalFetch = global.fetch;

function mockFetch(response: { membership: ReturnType<typeof buildMockMembership> | null; isActive: boolean }) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => response,
  }) as never;
}

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  // eslint-disable-next-line react/display-name
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

afterEach(() => {
  global.fetch = originalFetch;
  vi.clearAllMocks();
});

describe("useMembership", () => {
  it("returns membership data with tier info when isActive=true", async () => {
    mockFetch({ membership: buildMockMembership(), isActive: true });

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

  it("returns isMember=false when no membership", async () => {
    mockFetch({ membership: null, isActive: false });

    const { result } = renderHook(() => useMembership(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.membership).toBeNull();
    expect(result.current.isMember).toBe(false);
    expect(result.current.personalHoursRemaining).toBe(0);
    expect(result.current.virtualTasksRemaining).toBe(0);
  });

  it("returns membership but isMember=false when server reports isActive=false (e.g. expired period reset failed)", async () => {
    // Server returns the stale row (so dashboard can render) but isActive=false
    // so pricing won't grant member benefits
    mockFetch({
      membership: buildMockMembership({
        billing_period_end: "2026-04-30",
        personal_hours_used: 9,
      }),
      isActive: false,
    });

    const { result } = renderHook(() => useMembership(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.membership).toBeDefined();
    expect(result.current.isMember).toBe(false);
  });

  it("calls /api/members/me with credentials", async () => {
    mockFetch({ membership: null, isActive: false });

    renderHook(() => useMembership(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/members/me",
        expect.objectContaining({ credentials: "include" })
      );
    });
  });
});
