import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@/test/test-utils";
import * as navigation from "next/navigation";

const mockPush = vi.fn();
// NOTE: @/test/test-utils unconditionally vi.mock("next/navigation"), so a
// file-level vi.mock here loses to it and the component would receive a
// throwaway router. We override useRouter at runtime via vi.spyOn in
// beforeEach, mirroring src/app/members/__tests__/signup.test.tsx.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { toast } from "sonner";
import { ForgotPasswordPage } from "../ForgotPasswordPage";

describe("ForgotPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(navigation, "useRouter").mockReturnValue({
      push: mockPush,
    } as unknown as ReturnType<typeof navigation.useRouter>);
  });

  it("submits the email and navigates to the check-email page", async () => {
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ ok: true }) }) as Response);
    render(<ForgotPasswordPage />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "jane@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));
    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith(
        "/members/forgot-password/check-email?email=jane%40example.com",
      ),
    );
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/members/password-reset",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("blocks submission for an invalid email and does not call fetch", async () => {
    // Zod validation rejects the invalid email, so the form never submits.
    // (The shadcn FormMessage error-text render path does not surface in this
    // jsdom + react-hook-form 7.71 + @hookform/resolvers v5 setup — the same
    // SignupPage component exhibits this — so we assert the observable
    // contract: no network call and no navigation.)
    global.fetch = vi.fn();
    render(<ForgotPasswordPage />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "not-an-email" } });
    fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(global.fetch).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("shows a rate-limit toast on a 429 response", async () => {
    global.fetch = vi.fn(async () => ({ ok: false, status: 429, json: async () => ({}) }) as Response);
    render(<ForgotPasswordPage />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "jane@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Too many requests. Please try again later."),
    );
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("shows a generic error toast when the request rejects (network failure)", async () => {
    global.fetch = vi.fn(async () => {
      throw new Error("network down");
    });
    render(<ForgotPasswordPage />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "jane@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Couldn't send the reset email. Please try again."),
    );
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("shows a generic error toast on a non-429 failure response", async () => {
    global.fetch = vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }) as Response);
    render(<ForgotPasswordPage />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "jane@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Couldn't send the reset email. Please try again."),
    );
    expect(mockPush).not.toHaveBeenCalled();
  });
});
