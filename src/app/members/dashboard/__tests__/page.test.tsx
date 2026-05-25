import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@/test/test-utils";
import MemberDashboard from "../page";

const useAuthMock = vi.fn();
const useMembershipMock = vi.fn();

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("@/hooks/useMembership", () => ({
  useMembership: () => useMembershipMock(),
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQuery: () => ({ data: [], isLoading: false }),
  };
});

describe("MemberDashboard — header cleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthMock.mockReturnValue({
      user: { email: "ada@example.com", user_metadata: { name: "Ada" } },
      loading: false,
      signOut: vi.fn(),
      supabase: { from: () => ({ select: () => ({ eq: () => ({ order: vi.fn() }) }) }) },
    });
    useMembershipMock.mockReturnValue({
      membership: null,
      isLoading: false,
      isMember: false,
    });
  });

  it("renders the body-level Welcome heading", () => {
    render(<MemberDashboard />);
    expect(
      screen.getByRole("heading", { level: 1, name: /welcome back, ada/i }),
    ).toBeInTheDocument();
  });

  it("does NOT render a bespoke Sign Out button (Sign Out now lives in AccountMenu)", () => {
    render(<MemberDashboard />);
    expect(screen.queryByRole("button", { name: /sign out/i })).toBeNull();
  });

  it("does NOT render a bespoke inline Settings link in the page chrome", () => {
    render(<MemberDashboard />);
    expect(screen.queryByRole("link", { name: /^settings$/i })).toBeNull();
  });

  it("empty-bookings 'Book a Butler' CTA links to /butlers, not the homepage", () => {
    render(<MemberDashboard />);
    const bookButlerLink = screen.getByRole("link", { name: /book a butler/i });
    expect(bookButlerLink).toHaveAttribute("href", "/butlers");
  });
});
