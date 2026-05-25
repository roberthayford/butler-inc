import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@/test/test-utils";
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
      tier: { slug: "frequent", name: "Frequent" },
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
    expect(await screen.findByText("Frequent")).toBeInTheDocument();
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
    const priceLabels = await screen.findAllByText("£50/hr");
    // base, baby, busy, budget all show £50/hr (flat member rate) for members
    expect(priceLabels.length).toBeGreaterThanOrEqual(3);
  });

  it("shows booking flow when a butler is selected", async () => {
    render(<PersonalButlerPage />);
    const baseButton = await screen.findByRole("button", { name: /Base Butler/i });
    fireEvent.click(baseButton);
    expect(await screen.findByTestId("booking-flow")).toBeInTheDocument();
    expect(screen.getByText("BookingFlow:base")).toBeInTheDocument();
  });
});
