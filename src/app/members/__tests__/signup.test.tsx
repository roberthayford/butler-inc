import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@/test/test-utils";
import * as navigation from "next/navigation";
import { SignupPage } from "../signup/SignupPage";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams("next=/membership/checkout/lite"),
}));

describe("SignupPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(navigation, "useRouter").mockReturnValue({
      push: mockPush,
      replace: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    } as ReturnType<typeof navigation.useRouter>);
    vi.spyOn(navigation, "useSearchParams").mockReturnValue(
      new URLSearchParams("next=/membership/checkout/lite") as unknown as ReturnType<typeof navigation.useSearchParams>
    );
  });

  it("after successful signup, navigates to /members/signup/check-email with email and next params", async () => {
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ ok: true }) } as Response));
    render(<SignupPage />);
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "Jane" } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "jane@example.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "supersecret" } });
    fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: "07123456789" } });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));
    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith(
        "/members/signup/check-email?email=jane%40example.com&next=%2Fmembership%2Fcheckout%2Flite",
      ),
    );
  });

  it("after successful signup with no next param, navigates to check-email with only email", async () => {
    vi.spyOn(navigation, "useSearchParams").mockReturnValue(
      new URLSearchParams("") as unknown as ReturnType<typeof navigation.useSearchParams>,
    );
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ ok: true }) } as Response));
    render(<SignupPage />);
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "Jane" } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "jane@example.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "supersecret" } });
    fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: "07123456789" } });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));
    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith(
        "/members/signup/check-email?email=jane%40example.com",
      ),
    );
  });
});
