import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@/test/test-utils";
import { toast } from "sonner";
import { PlanManager } from "../PlanManager";

const { mockUseMembership, mockUseAuth } = vi.hoisted(() => ({
  mockUseMembership: vi.fn(),
  mockUseAuth: vi.fn(),
}));

vi.mock("@/hooks/useMembership", () => ({ useMembership: mockUseMembership }));
vi.mock("@/context/AuthContext", () => ({ useAuth: mockUseAuth }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function setMembership(membership: unknown, isMember = false) {
  mockUseMembership.mockReturnValue({
    membership,
    isMember,
    isLoading: false,
    personalHoursRemaining: 0,
    virtualTasksRemaining: 0,
  });
  mockUseAuth.mockReturnValue({ user: { id: "u1" } });
}

const baseTier = {
  id: "tier-lite",
  slug: "lite" as const,
  name: "Lite",
  description: "Perfect for occasional butler needs",
  personalHoursIncluded: 10,
  virtualTasksIncluded: 5,
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
      personalHoursTotal: 10, personalHoursUsed: 2,
      virtualTasksTotal: 5, virtualTasksUsed: 1,
      pausedAt: null,
    }, true);
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
      personalHoursTotal: 10, personalHoursUsed: 0,
      virtualTasksTotal: 5, virtualTasksUsed: 0,
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
      personalHoursTotal: 10, personalHoursUsed: 2,
      virtualTasksTotal: 5, virtualTasksUsed: 1,
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
      personalHoursTotal: 10, personalHoursUsed: 2,
      virtualTasksTotal: 5, virtualTasksUsed: 1,
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
      personalHoursTotal: 10, personalHoursUsed: 0,
      virtualTasksTotal: 5, virtualTasksUsed: 0,
      pausedAt: null,
    });
    render(<PlanManager />);
    expect(screen.getByText(/couldn.t charge your card/i)).toBeInTheDocument();
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
      personalHoursTotal: 10, personalHoursUsed: 0,
      virtualTasksTotal: 5, virtualTasksUsed: 0,
      pausedAt: null,
    });
    render(<PlanManager />);
    expect(screen.getByText(/Membership ended/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Subscribe again/i })).toHaveAttribute("href", "/membership");
  });
});

describe("PlanManager — action handlers", () => {
  const originalLocation = window.location;
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "location", {
      writable: true,
      configurable: true,
      value: { ...originalLocation, assign: vi.fn() },
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    Object.defineProperty(window, "location", { writable: true, configurable: true, value: originalLocation });
  });

  it("Manage subscription button POSTs /api/membership/portal and navigates to the returned URL", async () => {
    setMembership({
      tier: baseTier, status: "active", stripeSubscriptionId: "sub_1",
      cancelAtPeriodEnd: false, billingPeriodEnd: "2026-06-30",
      personalHoursTotal: 10, personalHoursUsed: 2,
      virtualTasksTotal: 5, virtualTasksUsed: 1, pausedAt: null,
    }, true);
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ url: "/payment/simulate-portal?customer_id=cus_1" }),
    }) as never;
    render(<PlanManager />);
    await userEvent.click(screen.getByRole("button", { name: /Manage subscription/i }));
    expect(global.fetch).toHaveBeenCalledWith("/api/membership/portal", expect.objectContaining({
      method: "POST",
    }));
    expect(window.location.assign).toHaveBeenCalledWith("/payment/simulate-portal?customer_id=cus_1");
  });

  it("Pause membership button POSTs /api/membership/pause with action=pause", async () => {
    setMembership({
      tier: baseTier, status: "active", stripeSubscriptionId: "sub_1",
      cancelAtPeriodEnd: false, billingPeriodEnd: "2026-06-30",
      personalHoursTotal: 10, personalHoursUsed: 2,
      virtualTasksTotal: 5, virtualTasksUsed: 1, pausedAt: null,
    }, true);
    global.fetch = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ status: "paused" }),
    }) as never;
    render(<PlanManager />);
    await userEvent.click(screen.getByRole("button", { name: /Pause membership/i }));
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/membership/pause",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ action: "pause" }) }),
    );
  });

  it("Resume button on a paused row POSTs action=resume", async () => {
    setMembership({
      tier: baseTier, status: "paused", stripeSubscriptionId: "sub_1",
      cancelAtPeriodEnd: false, billingPeriodEnd: "2026-06-30",
      personalHoursTotal: 10, personalHoursUsed: 2,
      virtualTasksTotal: 5, virtualTasksUsed: 1, pausedAt: "2026-05-20T12:00:00Z",
    });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ status: "active" }),
    }) as never;
    render(<PlanManager />);
    await userEvent.click(screen.getByRole("button", { name: /Resume membership/i }));
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/membership/pause",
      expect.objectContaining({ body: JSON.stringify({ action: "resume" }) }),
    );
  });

  it("renders an inline error when the API returns a non-2xx response", async () => {
    setMembership({
      tier: baseTier, status: "active", stripeSubscriptionId: "sub_1",
      cancelAtPeriodEnd: false, billingPeriodEnd: "2026-06-30",
      personalHoursTotal: 10, personalHoursUsed: 2,
      virtualTasksTotal: 5, virtualTasksUsed: 1, pausedAt: null,
    });
    global.fetch = vi.fn().mockResolvedValue({
      ok: false, status: 502,
      json: async () => ({ error: { code: "gateway_error", message: "network" } }),
    }) as never;
    render(<PlanManager />);
    await userEvent.click(screen.getByRole("button", { name: /Pause membership/i }));
    expect(await screen.findByText(/Something went wrong/i)).toBeInTheDocument();
  });
});

describe("PlanManager — toasts + portal snapshot", () => {
  const baseTierForSnap = {
    id: "tier-lite",
    slug: "lite" as const,
    name: "Lite",
    description: "Perfect for occasional butler needs",
    personalHoursIncluded: 10,
    virtualTasksIncluded: 5,
    monthlyPrice: 500,
    displayOrder: 1,
    isActive: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockUseMembership.mockReturnValue({
      isLoading: false,
      membership: {
        status: "active",
        tier: baseTierForSnap,
        personalHoursTotal: 10,
        personalHoursUsed: 2,
        billingPeriodEnd: "2026-06-25T00:00:00Z",
        stripeSubscriptionId: "sub_abc",
        cancelAtPeriodEnd: false,
        virtualTasksTotal: 5,
        virtualTasksUsed: 1,
        pausedAt: null,
      },
      isMember: true,
    });
    mockUseAuth.mockReturnValue({ user: { id: "u1" } });
  });

  afterEach(() => vi.clearAllMocks());

  it("toasts 'Membership paused' on successful pause", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }));
    render(<PlanManager />);
    await userEvent.click(screen.getByRole("button", { name: /Pause membership/i }));
    await vi.waitFor(() => expect(toast.success).toHaveBeenCalledWith("Membership paused"));
    vi.unstubAllGlobals();
  });

  it("stashes a portal snapshot before navigating to portal", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ url: "https://portal.example" }) }));
    Object.defineProperty(window, "location", { value: { assign: vi.fn() }, writable: true });
    render(<PlanManager />);
    await userEvent.click(screen.getByRole("button", { name: /Manage subscription/i }));
    await vi.waitFor(() => {
      const raw = sessionStorage.getItem("butlers.portal.snapshot.v1");
      expect(raw).toBeTruthy();
      const snap = JSON.parse(raw as string);
      expect(snap).toMatchObject({ status: "active", tierSlug: "lite", cancelAtPeriodEnd: false });
    });
    vi.unstubAllGlobals();
  });

  it("does NOT stash a portal snapshot when the portal fetch fails (regression: stale snapshot bug)", async () => {
    sessionStorage.clear();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 502, json: () => Promise.resolve({}) }));
    Object.defineProperty(window, "location", { value: { assign: vi.fn() }, writable: true });
    render(<PlanManager />);
    await userEvent.click(screen.getByRole("button", { name: /Manage subscription/i }));
    // Give the click handler a tick to settle.
    await new Promise((r) => setTimeout(r, 30));
    expect(sessionStorage.getItem("butlers.portal.snapshot.v1")).toBeNull();
    expect(window.location.assign).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
