import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, act } from "@/test/test-utils";
import * as navigation from "next/navigation";
import { CheckoutActivating } from "../CheckoutActivating";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }));

describe("CheckoutActivating", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.spyOn(navigation, "useRouter").mockReturnValue({
      push: mockPush,
      replace: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    } as ReturnType<typeof navigation.useRouter>);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("polls /api/members/me until status === 'active' and then routes to dashboard", async () => {
    let calls = 0;
    global.fetch = vi.fn(async () => {
      calls++;
      const body = calls < 3 ? { membership: null } : { membership: { status: "active" } };
      return { ok: true, json: async () => body } as Response;
    });

    render(<CheckoutActivating />);
    await act(async () => { await vi.advanceTimersByTimeAsync(2400); });
    expect(mockPush).toHaveBeenCalledWith("/members/dashboard?welcome=1");
  });

  it("renders fallback after 10s without an active membership", async () => {
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ membership: null }) } as Response));
    render(<CheckoutActivating />);
    await act(async () => { await vi.advanceTimersByTimeAsync(10100); });
    expect(screen.getByText(/taking longer than usual/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /go to dashboard/i })).toHaveAttribute("href", "/members/dashboard");
  });
});
