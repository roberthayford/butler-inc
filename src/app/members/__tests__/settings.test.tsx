import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@/test/test-utils";
import SettingsPage from "../settings/page";

const mockUpdateUser = vi.fn().mockResolvedValue({ data: {}, error: null });

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      email: "kwasi@example.com",
      user_metadata: { name: "Kwasi Hayford", phone: "07700900000" },
    },
    loading: false,
    supabase: {
      auth: {
        updateUser: mockUpdateUser,
      },
    },
  }),
}));

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateUser.mockResolvedValue({ data: {}, error: null });
  });

  it("renders profile section with current name and phone", async () => {
    render(<SettingsPage />);
    expect(await screen.findByText("Profile")).toBeInTheDocument();
    const nameInput = screen.getByLabelText(/Name/i);
    expect(nameInput).toHaveValue("Kwasi Hayford");
    const phoneInput = screen.getByLabelText(/Phone/i);
    expect(phoneInput).toHaveValue("07700900000");
  });

  it("renders email section with current email", async () => {
    render(<SettingsPage />);
    expect(await screen.findByText("Email")).toBeInTheDocument();
    const emailInput = screen.getByLabelText(/New Email/i);
    expect(emailInput).toHaveValue("");
    expect(screen.getByText("kwasi@example.com")).toBeInTheDocument();
  });

  it("renders password section", async () => {
    render(<SettingsPage />);
    expect(await screen.findByText("Password")).toBeInTheDocument();
    expect(screen.getByLabelText(/New Password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument();
  });

  it("updates profile on save", async () => {
    render(<SettingsPage />);
    const nameInput = await screen.findByLabelText(/Name/i);
    fireEvent.change(nameInput, { target: { value: "Kwasi H" } });
    const saveBtn = screen.getAllByRole("button", { name: /Save/i })[0];
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({
        data: { name: "Kwasi H", phone: "07700900000" },
      });
    });
  });

  it("shows error when passwords don't match", async () => {
    render(<SettingsPage />);
    const newPw = await screen.findByLabelText(/New Password/i);
    const confirmPw = screen.getByLabelText(/Confirm Password/i);
    fireEvent.change(newPw, { target: { value: "newpass123" } });
    fireEvent.change(confirmPw, { target: { value: "different" } });
    const pwSaveBtn = screen.getAllByRole("button", { name: /Update Password/i })[0];
    fireEvent.click(pwSaveBtn);

    expect(await screen.findByText(/Passwords do not match/i)).toBeInTheDocument();
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it("has a back link to dashboard", async () => {
    render(<SettingsPage />);
    const backLink = await screen.findByRole("link", { name: /Back to Dashboard/i });
    expect(backLink).toHaveAttribute("href", "/members/dashboard");
  });
});
