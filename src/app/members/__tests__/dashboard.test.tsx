import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@/test/test-utils";
import MemberDashboard from "../dashboard/page";

const mockAuth = vi.fn(() => ({
  user: { id: "user-1", email: "test@example.com", user_metadata: { name: "Jane" } },
  loading: false,
  signOut: vi.fn(),
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () =>
            Promise.resolve({
              data: [
                {
                  id: "booking-1",
                  butler_type: "busy",
                  service_option: "Courier and package services",
                  day_option: "advance",
                  time_slot: "morning",
                  reference: "REF001",
                  status: "confirmed",
                  created_at: "2026-03-15T10:00:00Z",
                },
              ],
              error: null,
            }),
        }),
      }),
    }),
  },
}));

const mockMembership = vi.fn(() => ({
  membership: {
    id: "mem-1",
    userId: "user-1",
    tierId: "tier-frequent",
    tier: {
      id: "tier-frequent",
      slug: "frequent",
      name: "Frequent",
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
  },
  isLoading: false,
  isMember: true,
  personalHoursRemaining: 8,
  virtualTasksRemaining: 5,
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => mockAuth(),
}));

vi.mock("@/hooks/useMembership", () => ({
  useMembership: () => mockMembership(),
}));

describe("MemberDashboard", () => {
  beforeEach(() => {
    mockMembership.mockImplementation(() => ({
      membership: {
        id: "mem-1",
        userId: "user-1",
        tierId: "tier-frequent",
        tier: {
          id: "tier-frequent",
          slug: "frequent",
          name: "Frequent",
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
      },
      isLoading: false,
      isMember: true,
      personalHoursRemaining: 8,
      virtualTasksRemaining: 5,
    }));
  });

  it("shows welcome message with user name", async () => {
    render(<MemberDashboard />);
    expect(await screen.findByText(/Welcome back, Jane/)).toBeInTheDocument();
  });

  it("shows tier badge for members", async () => {
    render(<MemberDashboard />);
    expect(await screen.findByText("Frequent")).toBeInTheDocument();
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

  it("still renders booking history", async () => {
    render(<MemberDashboard />);
    expect(await screen.findByText(/Busy Butler/)).toBeInTheDocument();
    expect(screen.getByText(/REF001/)).toBeInTheDocument();
  });
});

describe("Dashboard — no membership", () => {
  beforeEach(() => {
    mockMembership.mockImplementation(() => ({
      membership: null as unknown as ReturnType<typeof mockMembership>["membership"],
      isLoading: false,
      isMember: false,
      personalHoursRemaining: 0,
      virtualTasksRemaining: 0,
    }));
  });

  it("shows a 'Choose a plan' card linking to /membership", async () => {
    render(<MemberDashboard />);
    await waitFor(() => expect(screen.getByText(/choose a plan/i)).toBeInTheDocument());
    expect(screen.getByRole("link", { name: /see plans/i })).toHaveAttribute("href", "/membership");
  });
});

// Code-review fix #4: distinguish paused / cancelled / past_due from "no membership".
// Previously all four collapsed into the generic "Choose a plan" CTA, which on a
// paused row led the user to /membership → fresh checkout → duplicate row (triggers
// the multi-row trap from finding #3).

function makeNonActiveMembership(status: "paused" | "cancelled" | "past_due") {
  return {
    id: "mem-1",
    userId: "user-1",
    tierId: "tier-frequent",
    tier: {
      id: "tier-frequent", slug: "frequent", name: "Frequent",
      description: "", personalHoursIncluded: 20, virtualTasksIncluded: 10,
      monthlyPrice: 1000, displayOrder: 2, isActive: true,
    },
    personalHoursTotal: 20, personalHoursUsed: 7,
    virtualTasksTotal: 10, virtualTasksUsed: 3,
    billingPeriodStart: "2026-05-01", billingPeriodEnd: "2026-05-31",
    status,
    createdAt: "2026-04-30T00:00:00Z", updatedAt: "2026-05-20T00:00:00Z",
  };
}

describe("Dashboard — paused membership", () => {
  beforeEach(() => {
    mockMembership.mockImplementation(() => ({
      membership: makeNonActiveMembership("paused") as unknown as ReturnType<typeof mockMembership>["membership"],
      isLoading: false,
      isMember: false,
      personalHoursRemaining: 13,
      virtualTasksRemaining: 7,
    }));
  });

  it("renders a 'Membership paused' panel pointing at /members/settings (NOT /membership)", async () => {
    render(<MemberDashboard />);
    expect(await screen.findByText(/Membership paused/i)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Manage in settings/i });
    expect(link).toHaveAttribute("href", "/members/settings");
    // Critically: must NOT render the generic "Choose a plan" — that would lead
    // the user to create a duplicate subscription.
    expect(screen.queryByText(/choose a plan/i)).not.toBeInTheDocument();
  });
});

describe("Dashboard — cancelled membership", () => {
  beforeEach(() => {
    mockMembership.mockImplementation(() => ({
      membership: makeNonActiveMembership("cancelled") as unknown as ReturnType<typeof mockMembership>["membership"],
      isLoading: false,
      isMember: false,
      personalHoursRemaining: 0,
      virtualTasksRemaining: 0,
    }));
  });

  it("renders a 'Membership ended' panel with a 'Subscribe again' link to /membership", async () => {
    render(<MemberDashboard />);
    expect(await screen.findByText(/Membership ended/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Subscribe again/i })).toHaveAttribute("href", "/membership");
  });
});

describe("Dashboard — past_due membership", () => {
  beforeEach(() => {
    mockMembership.mockImplementation(() => ({
      membership: makeNonActiveMembership("past_due") as unknown as ReturnType<typeof mockMembership>["membership"],
      isLoading: false,
      isMember: false,
      personalHoursRemaining: 13,
      virtualTasksRemaining: 7,
    }));
  });

  it("renders a payment-issue panel pointing at /members/settings", async () => {
    render(<MemberDashboard />);
    expect(await screen.findByText(/couldn.t charge your card/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Update payment/i })).toHaveAttribute("href", "/members/settings");
    expect(screen.queryByText(/choose a plan/i)).not.toBeInTheDocument();
  });
});
