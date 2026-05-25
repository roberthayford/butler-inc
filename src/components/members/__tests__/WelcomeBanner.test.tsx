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
});
