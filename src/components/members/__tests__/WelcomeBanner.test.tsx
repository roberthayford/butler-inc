// src/components/members/__tests__/WelcomeBanner.test.tsx
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { WelcomeBanner } from "../WelcomeBanner";

const searchParamsMock = vi.fn();
vi.mock("next/navigation", () => ({ useSearchParams: () => searchParamsMock() }));

const useMembershipMock = vi.fn();
vi.mock("@/hooks/useMembership", () => ({ useMembership: () => useMembershipMock() }));

beforeEach(() => {
  localStorage.clear();
  useMembershipMock.mockReturnValue({ membership: { tier: { name: "Lite", personalHoursIncluded: 10 } } });
});
afterEach(() => vi.clearAllMocks());

describe("WelcomeBanner", () => {
  it("renders when ?welcome=1 and localStorage flag unset", () => {
    searchParamsMock.mockReturnValue(new URLSearchParams("welcome=1"));
    render(<WelcomeBanner />);
    expect(screen.getByText(/Welcome to Lite/i)).toBeInTheDocument();
  });
  it("hides when ?welcome flag absent", () => {
    searchParamsMock.mockReturnValue(new URLSearchParams(""));
    const { container } = render(<WelcomeBanner />);
    expect(container).toBeEmptyDOMElement();
  });
  it("hides after dismiss and writes localStorage flag", () => {
    searchParamsMock.mockReturnValue(new URLSearchParams("welcome=1"));
    const { container } = render(<WelcomeBanner />);
    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(container).toBeEmptyDOMElement();
    expect(localStorage.getItem("butlers.welcome.dismissed.v1")).toBe("1");
  });
  it("hides when localStorage flag already set, even with ?welcome=1", () => {
    localStorage.setItem("butlers.welcome.dismissed.v1", "1");
    searchParamsMock.mockReturnValue(new URLSearchParams("welcome=1"));
    const { container } = render(<WelcomeBanner />);
    expect(container).toBeEmptyDOMElement();
  });
  it("stays visible after a re-render with the ?welcome flag stripped (dashboard router.replace race)", () => {
    // Mount with welcome=1 → banner appears
    searchParamsMock.mockReturnValue(new URLSearchParams("welcome=1"));
    const { rerender } = render(<WelcomeBanner />);
    expect(screen.getByText(/Welcome to Lite/i)).toBeInTheDocument();
    // Simulate dashboard's router.replace("/members/dashboard") stripping the param
    searchParamsMock.mockReturnValue(new URLSearchParams(""));
    rerender(<WelcomeBanner />);
    // Regression: previously the banner unmounted on this re-render.
    expect(screen.getByText(/Welcome to Lite/i)).toBeInTheDocument();
  });
  it("does not crash when localStorage.getItem and setItem throw (Safari ITP / private browsing)", () => {
    const originalGetItem = Storage.prototype.getItem;
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.getItem = vi.fn(() => { throw new Error("SecurityError: storage unavailable"); });
    Storage.prototype.setItem = vi.fn(() => { throw new Error("QuotaExceededError"); });
    try {
      searchParamsMock.mockReturnValue(new URLSearchParams("welcome=1"));
      render(<WelcomeBanner />);
      // Banner should render (getItem threw → treated as not-dismissed)
      expect(screen.getByText(/Welcome to Lite/i)).toBeInTheDocument();
      // Dismiss click should not crash even though setItem throws
      fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));
      expect(screen.queryByText(/Welcome to Lite/i)).not.toBeInTheDocument();
    } finally {
      Storage.prototype.getItem = originalGetItem;
      Storage.prototype.setItem = originalSetItem;
    }
  });
});
