import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { JoinPage } from "../JoinPage";

const { mockReplace, useAuthMock } = vi.hoisted(() => ({
  mockReplace: vi.fn(),
  useAuthMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: mockReplace, back: vi.fn() }),
  usePathname: () => "/join",
  useSearchParams: () => new URLSearchParams(),
  notFound: vi.fn(),
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("JoinPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the sign-in form, pricing, and back-to-home when signed out", () => {
    useAuthMock.mockReturnValue({ user: null, loading: false, signIn: vi.fn() });
    const { container } = render(<JoinPage />);
    const text = container.textContent ?? "";

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(text).toContain("Lite");
    expect(text).toContain("Frequent");
    expect(text).toContain("Pro");
    expect(
      screen.getByRole("link", { name: /back to home/i })
    ).toHaveAttribute("href", "/");
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("renders nothing while auth is loading", () => {
    useAuthMock.mockReturnValue({ user: null, loading: true, signIn: vi.fn() });
    const { container } = render(<JoinPage />);
    expect(container).toBeEmptyDOMElement();
  });

  it("redirects signed-in users to the dashboard", () => {
    useAuthMock.mockReturnValue({
      user: { id: "u1", email: "a@b.com" },
      loading: false,
      signIn: vi.fn(),
    });
    render(<JoinPage />);
    expect(mockReplace).toHaveBeenCalledWith("/members/dashboard");
  });
});
