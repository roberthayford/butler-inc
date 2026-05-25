import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@/test/test-utils";
import SettingsPage from "../settings/page";

const mockUpdateUser = vi.fn().mockResolvedValue({ data: {}, error: null });
const mockFetch = vi.fn();

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

// PlanManager mounts on this page; stub useMembership so its internal
// useQuery doesn't trigger a real fetch and confuse mockFetch assertions.
vi.mock("@/hooks/useMembership", () => ({
  useMembership: () => ({
    membership: null,
    isMember: false,
    isLoading: false,
    personalHoursRemaining: 0,
    virtualTasksRemaining: 0,
  }),
}));

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateUser.mockResolvedValue({ data: {}, error: null });
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal("fetch", mockFetch);
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
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/members/profile",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ name: "Kwasi H", phone: "+447700900000" }),
        })
      );
    });
  });

  it("prompts users to fix invalid existing phone numbers on profile save", async () => {
    render(<SettingsPage />);
    const phoneInput = await screen.findByLabelText(/Phone/i);
    fireEvent.change(phoneInput, { target: { value: "07700 90000" } });
    const saveBtn = screen.getAllByRole("button", { name: /Save/i })[0];
    fireEvent.click(saveBtn);

    expect(
      await screen.findByText(/Phone number is too short for its country/i)
    ).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
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
});
