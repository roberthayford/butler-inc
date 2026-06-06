import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@/test/test-utils";
import * as navigation from "next/navigation";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const mockUpdateUser = vi.fn();
let mockAuth: {
  user: unknown;
  loading: boolean;
  supabase: { auth: { updateUser: typeof mockUpdateUser } };
};
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => mockAuth,
}));

import { toast } from "sonner";
import { ResetPasswordPage } from "../ResetPasswordPage";

const supabase = { auth: { updateUser: mockUpdateUser } };

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(navigation, "useRouter").mockReturnValue({
      push: mockPush,
    } as unknown as ReturnType<typeof navigation.useRouter>);
    mockUpdateUser.mockResolvedValue({ error: null });
    mockAuth = { user: { id: "u1" }, loading: false, supabase };
  });

  it("shows a loading state while auth resolves", () => {
    mockAuth = { user: null, loading: true, supabase };
    render(<ResetPasswordPage />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /update password/i })).toBeNull();
  });

  it("shows the invalid-link state when there is no session", () => {
    mockAuth = { user: null, loading: false, supabase };
    render(<ResetPasswordPage />);
    expect(screen.getByText(/invalid or has expired/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /request a new link/i })).toHaveAttribute(
      "href",
      "/members/forgot-password",
    );
  });

  it("updates the password and redirects to the dashboard on success", async () => {
    render(<ResetPasswordPage />);
    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: "secret123" } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "secret123" } });
    fireEvent.click(screen.getByRole("button", { name: /update password/i }));
    await waitFor(() => expect(mockUpdateUser).toHaveBeenCalledWith({ password: "secret123" }));
    expect(mockPush).toHaveBeenCalledWith("/members/dashboard");
    expect(toast.success).toHaveBeenCalledWith("Password updated");
  });

  it("does not submit when passwords do not match", async () => {
    render(<ResetPasswordPage />);
    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: "secret123" } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "different1" } });
    fireEvent.click(screen.getByRole("button", { name: /update password/i }));
    await new Promise((r) => setTimeout(r, 200));
    expect(mockUpdateUser).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("does not submit when the password is too short", async () => {
    render(<ResetPasswordPage />);
    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: "123" } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "123" } });
    fireEvent.click(screen.getByRole("button", { name: /update password/i }));
    await new Promise((r) => setTimeout(r, 200));
    expect(mockUpdateUser).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
