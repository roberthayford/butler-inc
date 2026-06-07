import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@/test/test-utils";
import * as navigation from "next/navigation";
import { Header } from "../Header";

const {
  pathnameRef,
  useAuthMock,
  isAdminMock,
  mockSignOut,
  mockPush,
  toastSuccess,
  toastError,
} = vi.hoisted(() => ({
  pathnameRef: { current: "/" },
  useAuthMock: vi.fn(),
  isAdminMock: vi.fn(),
  mockSignOut: vi.fn(),
  mockPush: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("@/lib/admin", () => ({
  isAdmin: (email?: string) => isAdminMock(email),
}));

vi.mock("sonner", () => ({
  toast: { success: toastSuccess, error: toastError },
}));

const loggedOut = { user: null, loading: false, signOut: mockSignOut };
const loggedIn = {
  user: { email: "ada@example.com", user_metadata: { name: "Ada" } },
  loading: false,
  signOut: mockSignOut,
};
const loading = { user: null, loading: true, signOut: mockSignOut };

describe("Header", () => {
  beforeEach(() => {
    pathnameRef.current = "/";
    vi.clearAllMocks();
    isAdminMock.mockReturnValue(false);
    mockSignOut.mockResolvedValue(undefined);
    vi.spyOn(navigation, "usePathname").mockImplementation(() => pathnameRef.current);
    vi.spyOn(navigation, "useRouter").mockReturnValue({
      push: mockPush,
      replace: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    } as ReturnType<typeof navigation.useRouter>);
  });

  it("Create Account CTA links to /members/signup (not /membership)", () => {
    useAuthMock.mockReturnValue(loggedOut);
    render(<Header />);
    const signupLinks = screen.getAllByRole("link", { name: /create account/i });
    expect(signupLinks.length).toBeGreaterThan(0);
    signupLinks.forEach((link) => {
      expect(link).toHaveAttribute("href", "/members/signup");
    });
  });

  it("logged-out user on / sees Sign In and Create Account", () => {
    useAuthMock.mockReturnValue(loggedOut);
    render(<Header />);
    expect(screen.getAllByRole("link", { name: /sign in/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /create account/i }).length).toBeGreaterThan(0);
  });

  it("Sign In links to /join (the Members entry), matching the homepage", () => {
    useAuthMock.mockReturnValue(loggedOut);
    render(<Header />);
    const signInLinks = screen.getAllByRole("link", { name: /sign in/i });
    expect(signInLinks.length).toBeGreaterThan(0);
    signInLinks.forEach((link) => {
      expect(link).toHaveAttribute("href", "/join");
    });
  });

  it("logged-out user on /join does NOT see Sign In or Create Account", () => {
    pathnameRef.current = "/join";
    useAuthMock.mockReturnValue(loggedOut);
    render(<Header />);
    expect(screen.queryByRole("link", { name: /sign in/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /create account/i })).toBeNull();
  });

  it("logged-out user on /members/login does NOT see Sign In or Create Account", () => {
    pathnameRef.current = "/members/login";
    useAuthMock.mockReturnValue(loggedOut);
    render(<Header />);
    expect(screen.queryByRole("link", { name: /sign in/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /create account/i })).toBeNull();
  });

  it("logged-out user on /members/signup does NOT see Sign In or Create Account", () => {
    pathnameRef.current = "/members/signup";
    useAuthMock.mockReturnValue(loggedOut);
    render(<Header />);
    expect(screen.queryByRole("link", { name: /sign in/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /create account/i })).toBeNull();
  });

  it("logged-out user on /members/signup/check-email does NOT see Sign In or Create Account", () => {
    pathnameRef.current = "/members/signup/check-email";
    useAuthMock.mockReturnValue(loggedOut);
    render(<Header />);
    expect(screen.queryByRole("link", { name: /sign in/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /create account/i })).toBeNull();
  });

  it("logged-out user on /members/dashboard still sees Sign In and Create Account (suppression scoped to auth pages only)", () => {
    pathnameRef.current = "/members/dashboard";
    useAuthMock.mockReturnValue(loggedOut);
    render(<Header />);
    expect(screen.getAllByRole("link", { name: /sign in/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /create account/i }).length).toBeGreaterThan(0);
  });

  it("logged-in user sees AccountMenu trigger, not a standalone Dashboard link in the desktop nav", () => {
    useAuthMock.mockReturnValue(loggedIn);
    render(<Header />);
    expect(screen.getByRole("button", { name: /account menu/i })).toBeInTheDocument();
    const dashboardLinks = screen.queryAllByRole("link", { name: /^dashboard$/i });
    expect(dashboardLinks.length).toBe(0);
  });

  it("logged-in user does not see Sign In or Create Account", () => {
    useAuthMock.mockReturnValue(loggedIn);
    render(<Header />);
    expect(screen.queryByRole("link", { name: /sign in/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /create account/i })).toBeNull();
  });

  it("loading state renders neither auth branch (no Sign In, no AccountMenu)", () => {
    useAuthMock.mockReturnValue(loading);
    render(<Header />);
    expect(screen.queryByRole("link", { name: /sign in/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /account menu/i })).toBeNull();
  });

  it("mobile Sign Out calls signOut, toasts success, and pushes to /", async () => {
    useAuthMock.mockReturnValue(loggedIn);
    render(<Header />);
    fireEvent.click(screen.getByRole("button", { name: /open menu/i }));
    const signOutButton = await screen.findByRole("button", { name: /sign out/i });
    fireEvent.click(signOutButton);
    await waitFor(() => expect(mockSignOut).toHaveBeenCalledTimes(1));
    expect(toastSuccess).toHaveBeenCalledWith("Signed out");
    expect(mockPush).toHaveBeenCalledWith("/");
  });

  it.each([
    "/members/forgot-password",
    "/members/forgot-password/check-email",
    "/members/reset-password",
  ])("logged-out user on %s does NOT see Sign In or Create Account", (path) => {
    pathnameRef.current = path;
    useAuthMock.mockReturnValue(loggedOut);
    render(<Header />);
    expect(screen.queryByRole("link", { name: /sign in/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /create account/i })).toBeNull();
  });
});
