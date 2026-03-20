import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@/test/test-utils";
import MemberDashboard from "../dashboard/page";

// Mock auth — provide a logged-in user
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

describe("MemberDashboard", () => {
  it("renders butler name as display label not raw key", async () => {
    render(<MemberDashboard />);
    expect(await screen.findByText(/Busy Butler/)).toBeInTheDocument();
    expect(screen.queryByText(/^busy Butler/)).not.toBeInTheDocument();
  });

  it("renders day option as display label not raw key", async () => {
    render(<MemberDashboard />);
    // "72+ Hours Notice" is the label for "advance"
    expect(await screen.findByText(/72\+ Hours Notice/)).toBeInTheDocument();
    expect(screen.queryByText(/\badvance\b/)).not.toBeInTheDocument();
  });

  it("renders time slot as display label not raw key", async () => {
    render(<MemberDashboard />);
    expect(await screen.findByText(/Morning/)).toBeInTheDocument();
  });

  it("renders a formatted booking date", async () => {
    render(<MemberDashboard />);
    // Booking created_at: 2026-03-15T10:00:00Z → "15 Mar 2026"
    expect(await screen.findByText(/15 Mar 2026/)).toBeInTheDocument();
  });
});
