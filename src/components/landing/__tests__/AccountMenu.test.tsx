import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@/test/test-utils";
import * as navigation from "next/navigation";
import { AccountMenu } from "../AccountMenu";

const { mockSignOut, mockPush, useAuthMock, isAdminMock, toastSuccess, toastError } = vi.hoisted(
  () => ({
    mockSignOut: vi.fn(),
    mockPush: vi.fn(),
    useAuthMock: vi.fn(),
    isAdminMock: vi.fn(),
    toastSuccess: vi.fn(),
    toastError: vi.fn(),
  }),
);

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("@/lib/admin", () => ({
  isAdmin: (email?: string) => isAdminMock(email),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  notFound: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: toastSuccess, error: toastError },
}));

function setUser(overrides: Partial<{ email: string; name: string }> = {}) {
  useAuthMock.mockReturnValue({
    user: {
      email: overrides.email ?? "ada@example.com",
      user_metadata: overrides.name !== undefined ? { name: overrides.name } : {},
    },
    signOut: mockSignOut,
  });
}

describe("AccountMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isAdminMock.mockReturnValue(false);
    mockSignOut.mockResolvedValue(undefined);
    vi.spyOn(navigation, "useRouter").mockReturnValue({
      push: mockPush,
      replace: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    } as ReturnType<typeof navigation.useRouter>);
  });

  it("renders nothing when no user", () => {
    useAuthMock.mockReturnValue({ user: null, signOut: mockSignOut });
    const { container } = render(<AccountMenu />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders initials from name when present", () => {
    setUser({ name: "Ada Lovelace" });
    render(<AccountMenu />);
    expect(screen.getByRole("button", { name: /account menu/i })).toHaveTextContent("AL");
  });

  it("falls back to first letter of email when no name", () => {
    setUser({ email: "ada@example.com" });
    render(<AccountMenu />);
    expect(screen.getByRole("button", { name: /account menu/i })).toHaveTextContent("A");
  });

  it("menu is closed by default", () => {
    setUser();
    render(<AccountMenu />);
    expect(screen.queryByRole("menu")).toBeNull();
    expect(screen.getByRole("button", { name: /account menu/i })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("clicking trigger opens the menu with Dashboard, Settings, Sign Out", () => {
    setUser();
    render(<AccountMenu />);
    fireEvent.click(screen.getByRole("button", { name: /account menu/i }));
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /dashboard/i })).toHaveAttribute(
      "href",
      "/members/dashboard",
    );
    expect(screen.getByRole("menuitem", { name: /settings/i })).toHaveAttribute(
      "href",
      "/members/settings",
    );
    expect(screen.getByRole("menuitem", { name: /sign out/i })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /admin/i })).toBeNull();
  });

  it("shows Admin item only when isAdmin returns true", () => {
    setUser();
    isAdminMock.mockReturnValue(true);
    render(<AccountMenu />);
    fireEvent.click(screen.getByRole("button", { name: /account menu/i }));
    expect(screen.getByRole("menuitem", { name: /admin/i })).toHaveAttribute("href", "/admin");
  });

  it("Sign Out calls signOut, toasts success, and pushes to /", async () => {
    setUser();
    render(<AccountMenu />);
    fireEvent.click(screen.getByRole("button", { name: /account menu/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /sign out/i }));
    await waitFor(() => expect(mockSignOut).toHaveBeenCalledTimes(1));
    expect(toastSuccess).toHaveBeenCalledWith("Signed out");
    expect(mockPush).toHaveBeenCalledWith("/");
  });

  it("Sign Out failure shows error toast and does not navigate", async () => {
    setUser();
    mockSignOut.mockRejectedValueOnce(new Error("network"));
    render(<AccountMenu />);
    fireEvent.click(screen.getByRole("button", { name: /account menu/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /sign out/i }));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Sign out failed. Try again."));
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("Escape closes the menu and returns focus to trigger", () => {
    setUser();
    render(<AccountMenu />);
    const trigger = screen.getByRole("button", { name: /account menu/i });
    fireEvent.click(trigger);
    expect(screen.getByRole("menu")).toBeInTheDocument();
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(screen.queryByRole("menu")).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it("clicking outside closes the menu", () => {
    setUser();
    render(
      <div>
        <button data-testid="outside">outside</button>
        <AccountMenu />
      </div>,
    );
    fireEvent.click(screen.getByRole("button", { name: /account menu/i }));
    expect(screen.getByRole("menu")).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByTestId("outside"));
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("ArrowDown from trigger focuses first menu item; ArrowDown from last wraps to first", () => {
    setUser();
    render(<AccountMenu />);
    fireEvent.click(screen.getByRole("button", { name: /account menu/i }));
    const menu = screen.getByRole("menu");
    const items = screen.getAllByRole("menuitem");
    fireEvent.keyDown(menu, { key: "ArrowDown" });
    expect(items[0]).toHaveFocus();
    items[items.length - 1].focus();
    fireEvent.keyDown(menu, { key: "ArrowDown" });
    expect(items[0]).toHaveFocus();
  });
});
