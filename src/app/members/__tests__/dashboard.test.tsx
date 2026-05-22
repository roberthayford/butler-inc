import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@/test/test-utils";
import MemberDashboard from "../dashboard/page";

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
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
  }),
}));

vi.mock("@/hooks/useMembership", () => ({
  useMembership: () => ({
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
      status: "active",
      createdAt: "2026-03-31T00:00:00Z",
      updatedAt: "2026-03-31T00:00:00Z",
    },
    isLoading: false,
    isMember: true,
    personalHoursRemaining: 8,
    virtualTasksRemaining: 5,
  }),
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

  it("still renders booking history", async () => {
    render(<MemberDashboard />);
    expect(await screen.findByText(/Busy Butler/)).toBeInTheDocument();
    expect(screen.getByText(/REF001/)).toBeInTheDocument();
  });
});
