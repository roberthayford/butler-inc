// src/components/members/__tests__/MembershipBanner.test.tsx
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MembershipBanner } from "../MembershipBanner";

const useMembershipMock = vi.fn();
vi.mock("@/hooks/useMembership", () => ({ useMembership: () => useMembershipMock() }));
vi.mock("@/context/AuthContext", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ invalidateQueries: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ url: "https://portal.example" }) }));
  Object.defineProperty(window, "location", { value: { assign: vi.fn() }, writable: true });
});
afterEach(() => vi.unstubAllGlobals());

describe("MembershipBanner", () => {
  it("renders nothing for active members not pending cancel", () => {
    useMembershipMock.mockReturnValue({ membership: { status: "active", cancelAtPeriodEnd: false, tier: { name: "Lite" } } });
    const { container } = render(<MembershipBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders past_due variant with copy + update-payment button", async () => {
    useMembershipMock.mockReturnValue({ membership: { status: "past_due", cancelAtPeriodEnd: false, tier: { name: "Pro" } } });
    render(<MembershipBanner />);
    expect(screen.getByText(/We couldn't charge your card/i)).toBeInTheDocument();
    expect(screen.getByText(/Pro/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Update payment method/i })).toBeInTheDocument();
  });

  it("renders paused variant with copy + resume button", () => {
    useMembershipMock.mockReturnValue({ membership: { status: "paused", cancelAtPeriodEnd: false, tier: { name: "Lite" } } });
    render(<MembershipBanner />);
    expect(screen.getByText(/Your membership is paused/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Resume membership/i })).toBeInTheDocument();
  });

  it("renders pending-cancel variant with reactivate button", () => {
    useMembershipMock.mockReturnValue({ membership: { status: "active", cancelAtPeriodEnd: true, tier: { name: "Frequent" }, billingPeriodEnd: "2026-06-25T00:00:00Z", personalHoursTotal: 20, personalHoursUsed: 12 } });
    render(<MembershipBanner />);
    expect(screen.getByText(/Cancellation scheduled/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Reactivate subscription/i })).toBeInTheDocument();
  });

  it("update payment button POSTs to portal and navigates", async () => {
    useMembershipMock.mockReturnValue({ membership: { status: "past_due", cancelAtPeriodEnd: false, tier: { name: "Pro" } } });
    render(<MembershipBanner />);
    fireEvent.click(screen.getByRole("button", { name: /Update payment method/i }));
    await vi.waitFor(() => expect(window.location.assign).toHaveBeenCalledWith("https://portal.example"));
  });
});
