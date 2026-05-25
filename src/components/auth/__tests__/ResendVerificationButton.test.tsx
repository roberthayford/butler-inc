import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@/test/test-utils";
import { ResendVerificationButton } from "../ResendVerificationButton";

const { mockResend, toastSuccess, toastError } = vi.hoisted(() => ({
  mockResend: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { resend: mockResend },
  }),
}));

vi.mock("sonner", () => ({
  toast: { success: toastSuccess, error: toastError },
}));

const ORIGINAL_LOCATION = window.location;

describe("ResendVerificationButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResend.mockResolvedValue({ data: {}, error: null });
    Object.defineProperty(window, "location", {
      writable: true,
      value: { ...ORIGINAL_LOCATION, origin: "https://example.test" },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(window, "location", {
      writable: true,
      value: ORIGINAL_LOCATION,
    });
  });

  it("renders nothing when email is null", () => {
    const { container } = render(
      <ResendVerificationButton email={null} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the default label when idle", () => {
    render(<ResendVerificationButton email="ada@example.com" />);
    expect(
      screen.getByRole("button", { name: /resend verification email/i }),
    ).toBeInTheDocument();
  });

  it("click calls supabase.auth.resend with type=signup, email, and emailRedirectTo", async () => {
    render(<ResendVerificationButton email="ada@example.com" />);
    fireEvent.click(
      screen.getByRole("button", { name: /resend verification email/i }),
    );
    await waitFor(() => expect(mockResend).toHaveBeenCalledTimes(1));
    expect(mockResend).toHaveBeenCalledWith({
      type: "signup",
      email: "ada@example.com",
      options: {
        emailRedirectTo: "https://example.test/auth/callback",
      },
    });
  });

  it("appends ?next= to emailRedirectTo when next prop is provided", async () => {
    render(
      <ResendVerificationButton
        email="ada@example.com"
        next="/membership/checkout/lite"
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /resend verification email/i }),
    );
    await waitFor(() => expect(mockResend).toHaveBeenCalledTimes(1));
    expect(mockResend.mock.calls[0][0].options.emailRedirectTo).toBe(
      "https://example.test/auth/callback?next=%2Fmembership%2Fcheckout%2Flite",
    );
  });

  it("success: toasts success message and starts cooldown", async () => {
    vi.useFakeTimers();
    render(<ResendVerificationButton email="ada@example.com" />);
    fireEvent.click(
      screen.getByRole("button", { name: /resend verification email/i }),
    );
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(toastSuccess).toHaveBeenCalledWith("Verification email sent");
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent(/resend in 30s/i);
  });

  it("cooldown ticks down each second", async () => {
    vi.useFakeTimers();
    render(<ResendVerificationButton email="ada@example.com" />);
    fireEvent.click(
      screen.getByRole("button", { name: /resend verification email/i }),
    );
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(toastSuccess).toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(screen.getByRole("button")).toHaveTextContent(/resend in 25s/i);
  });

  it("cooldown ends after 30s; button re-enables", async () => {
    vi.useFakeTimers();
    render(<ResendVerificationButton email="ada@example.com" />);
    fireEvent.click(
      screen.getByRole("button", { name: /resend verification email/i }),
    );
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(toastSuccess).toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    const button = screen.getByRole("button");
    expect(button).not.toBeDisabled();
    expect(button).toHaveTextContent(/resend verification email/i);
  });

  it("supabase error: toasts the supabase message verbatim and does NOT start cooldown", async () => {
    mockResend.mockResolvedValueOnce({
      data: null,
      error: { message: "For security purposes, you can only request this once every 60 seconds" },
    });
    render(<ResendVerificationButton email="ada@example.com" />);
    fireEvent.click(
      screen.getByRole("button", { name: /resend verification email/i }),
    );
    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(
        "For security purposes, you can only request this once every 60 seconds",
      ),
    );
    expect(toastSuccess).not.toHaveBeenCalled();
    expect(screen.getByRole("button")).not.toBeDisabled();
  });

  it("network failure: toasts a generic message and does NOT start cooldown", async () => {
    mockResend.mockRejectedValueOnce(new Error("network down"));
    render(<ResendVerificationButton email="ada@example.com" />);
    fireEvent.click(
      screen.getByRole("button", { name: /resend verification email/i }),
    );
    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(
        "Couldn't resend right now. Please try again.",
      ),
    );
    expect(toastSuccess).not.toHaveBeenCalled();
    expect(screen.getByRole("button")).not.toBeDisabled();
  });
});
