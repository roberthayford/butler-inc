import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { SignInForm } from "../SignInForm";

const { mockPush, mockSignIn, toastError } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockSignIn: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ signIn: mockSignIn }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  notFound: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: toastError },
}));

async function submitValid() {
  fireEvent.change(screen.getByLabelText(/email/i), {
    target: { value: "member@example.com" },
  });
  fireEvent.change(screen.getByLabelText(/password/i), {
    target: { value: "supersecret" },
  });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
  });
}

describe("SignInForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignIn.mockResolvedValue({ error: null });
  });

  it("renders the email and password fields and the helper links", () => {
    render(<SignInForm />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /forgot password/i })
    ).toHaveAttribute("href", "/members/forgot-password");
    expect(
      screen.getByRole("link", { name: /create an account/i })
    ).toHaveAttribute("href", "/members/signup");
  });

  it("pushes to the dashboard on success by default", async () => {
    render(<SignInForm />);
    await submitValid();
    expect(mockPush).toHaveBeenCalledWith("/members/dashboard");
  });

  it("calls onSuccess instead of the default push when provided", async () => {
    const onSuccess = vi.fn();
    render(<SignInForm onSuccess={onSuccess} />);
    await submitValid();
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("shows a toast and does not navigate on sign-in error", async () => {
    mockSignIn.mockResolvedValue({ error: { message: "Invalid credentials" } });
    render(<SignInForm />);
    await submitValid();
    expect(toastError).toHaveBeenCalledWith("Invalid credentials");
    expect(mockPush).not.toHaveBeenCalled();
  });
});
