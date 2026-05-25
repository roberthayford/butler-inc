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
      tier: { slug: "frequent", name: "Frequent" },
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
    expect(screen.getByLabelText(/Describe your request/i)).toBeInTheDocument();
  });

  it("shows request history section", async () => {
    render(<VirtualButlerPage />);
    expect(await screen.findByText(/Request History/i)).toBeInTheDocument();
  });
});
