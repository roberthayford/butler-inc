import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSearchParams, useRouter } from "next/navigation";
import { MemberDashboard } from "../page";

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

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(),
  useRouter: vi.fn(),
  usePathname: vi.fn(() => "/members/dashboard"),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: Record<string, unknown>) => (
    <a href={href as string} {...props}>
      {children as React.ReactNode}
    </a>
  ),
}));

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...props} alt={props.alt as string} />
  ),
}));

function renderDashboard() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemberDashboard />
    </QueryClientProvider>
  );
}

describe("MemberDashboard — header cleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(new URLSearchParams(""));
    (useRouter as ReturnType<typeof vi.fn>).mockReturnValue({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() });
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
    renderDashboard();
    expect(
      screen.getByRole("heading", { level: 1, name: /welcome back, ada/i }),
    ).toBeInTheDocument();
  });

  it("does NOT render a bespoke Sign Out button (Sign Out now lives in AccountMenu)", () => {
    renderDashboard();
    expect(screen.queryByRole("button", { name: /sign out/i })).toBeNull();
  });

  it("does NOT render a bespoke inline Settings link in the page chrome", () => {
    renderDashboard();
    expect(screen.queryByRole("link", { name: /^settings$/i })).toBeNull();
  });

  it("empty-bookings 'Book a Butler' CTA links to /butlers, not the homepage", () => {
    renderDashboard();
    const bookButlerLink = screen.getByRole("link", { name: /book a butler/i });
    expect(bookButlerLink).toHaveAttribute("href", "/butlers");
  });

  it("fires welcome toast and replaces URL when ?welcome=1 is present", async () => {
    (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(new URLSearchParams("welcome=1"));
    const replace = vi.fn();
    (useRouter as ReturnType<typeof vi.fn>).mockReturnValue({ replace, push: vi.fn(), prefetch: vi.fn() });
    useMembershipMock.mockReturnValue({
      membership: { tier: { name: "Lite" }, status: "active" },
      isLoading: false,
      isMember: true,
    });
    renderDashboard();
    await vi.waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/Welcome/i));
      expect(replace).toHaveBeenCalledWith("/members/dashboard");
    });
  });

  it("does NOT fire welcome toast when ?welcome param is absent", async () => {
    (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(new URLSearchParams(""));
    const replace = vi.fn();
    (useRouter as ReturnType<typeof vi.fn>).mockReturnValue({ replace, push: vi.fn(), prefetch: vi.fn() });
    renderDashboard();
    await new Promise((r) => setTimeout(r, 10));
    expect(toast.success).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });
});
