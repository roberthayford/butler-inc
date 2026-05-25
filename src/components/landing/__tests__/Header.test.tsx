import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@/test/test-utils";
import * as navigation from "next/navigation";
import { Header } from "../Header";

const { pathnameRef, useAuthMock, isAdminMock } = vi.hoisted(() => ({
  pathnameRef: { current: "/" },
  useAuthMock: vi.fn(),
  isAdminMock: vi.fn(),
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("@/lib/admin", () => ({
  isAdmin: (email?: string) => isAdminMock(email),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const loggedOut = { user: null, loading: false, signOut: vi.fn() };
const loggedIn = {
  user: { email: "ada@example.com", user_metadata: { name: "Ada" } },
  loading: false,
  signOut: vi.fn(),
};
const loading = { user: null, loading: true, signOut: vi.fn() };

describe("Header", () => {
  beforeEach(() => {
    pathnameRef.current = "/";
    vi.clearAllMocks();
    isAdminMock.mockReturnValue(false);
    vi.spyOn(navigation, "usePathname").mockImplementation(() => pathnameRef.current);
    vi.spyOn(navigation, "useRouter").mockReturnValue({
      push: vi.fn(),
      replace: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    } as ReturnType<typeof navigation.useRouter>);
  });

  it("Join CTA links to /membership (not /members/signup)", () => {
    useAuthMock.mockReturnValue(loggedOut);
    render(<Header />);
    const joinLinks = screen.getAllByRole("link", { name: /^join$/i });
    expect(joinLinks.length).toBeGreaterThan(0);
    joinLinks.forEach((link) => {
      expect(link).toHaveAttribute("href", "/membership");
    });
  });

  it("logged-out user on / sees Sign In and Join", () => {
    useAuthMock.mockReturnValue(loggedOut);
    render(<Header />);
    expect(screen.getAllByRole("link", { name: /sign in/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /^join$/i }).length).toBeGreaterThan(0);
  });

  it("logged-out user on /members/login does NOT see Sign In or Join", () => {
    pathnameRef.current = "/members/login";
    useAuthMock.mockReturnValue(loggedOut);
    render(<Header />);
    expect(screen.queryByRole("link", { name: /sign in/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /^join$/i })).toBeNull();
  });

  it("logged-out user on /members/signup does NOT see Sign In or Join", () => {
    pathnameRef.current = "/members/signup";
    useAuthMock.mockReturnValue(loggedOut);
    render(<Header />);
    expect(screen.queryByRole("link", { name: /sign in/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /^join$/i })).toBeNull();
  });

  it("logged-out user on /members/dashboard still sees Sign In and Join (suppression scoped to auth pages only)", () => {
    pathnameRef.current = "/members/dashboard";
    useAuthMock.mockReturnValue(loggedOut);
    render(<Header />);
    expect(screen.getAllByRole("link", { name: /sign in/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /^join$/i }).length).toBeGreaterThan(0);
  });

  it("logged-in user sees AccountMenu trigger, not a standalone Dashboard link in the desktop nav", () => {
    useAuthMock.mockReturnValue(loggedIn);
    render(<Header />);
    expect(screen.getByRole("button", { name: /account menu/i })).toBeInTheDocument();
    const dashboardLinks = screen.queryAllByRole("link", { name: /^dashboard$/i });
    expect(dashboardLinks.length).toBe(0);
  });

  it("logged-in user does not see Sign In or Join", () => {
    useAuthMock.mockReturnValue(loggedIn);
    render(<Header />);
    expect(screen.queryByRole("link", { name: /sign in/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /^join$/i })).toBeNull();
  });

  it("loading state renders neither auth branch (no Sign In, no AccountMenu)", () => {
    useAuthMock.mockReturnValue(loading);
    render(<Header />);
    expect(screen.queryByRole("link", { name: /sign in/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /account menu/i })).toBeNull();
  });
});
