import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@/test/test-utils";
import { useAuth } from "@/context/AuthContext";
import { BookingForm } from "../BookingForm";

vi.mock("@/context/AuthContext", () => ({
  useAuth: vi.fn().mockReturnValue({
    user: null,
    session: null,
    loading: false,
    supabase: {},
    signUp: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
}));

vi.mock("motion/react", () => ({
  motion: {
    button: ({
      children,
      ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
      children: React.ReactNode;
    }) => <button {...props}>{children}</button>,
    div: ({
      children,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & {
      children: React.ReactNode;
    }) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

describe("BookingForm", () => {
  const defaultProps = {
    onSubmit: vi.fn(),
    isSubmitting: false,
  };

  it("renders all day option buttons", () => {
    render(<BookingForm {...defaultProps} />);

    expect(screen.getByText("Same Day")).toBeInTheDocument();
    expect(screen.getByText("Next Day")).toBeInTheDocument();
    expect(screen.getByText("72+ Hours Notice")).toBeInTheDocument();
  });

  it("renders all time slot buttons", () => {
    render(<BookingForm {...defaultProps} />);

    expect(screen.getByText("Morning")).toBeInTheDocument();
    expect(screen.getByText("Noon")).toBeInTheDocument();
    expect(screen.getByText("Evening")).toBeInTheDocument();
  });

  it("renders contact detail inputs", () => {
    render(<BookingForm {...defaultProps} />);

    expect(screen.getByPlaceholderText("Jane Smith")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("you@example.com")
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("07700 900000")
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Any specific requirements or details...")
    ).toBeInTheDocument();
  });

  it("renders submit button", () => {
    render(<BookingForm {...defaultProps} />);
    expect(screen.getByRole("button", { name: /Request Your Butler/i })).toBeInTheDocument();
  });

  it("shows loading text when isSubmitting is true", () => {
    render(<BookingForm {...defaultProps} isSubmitting={true} />);
    expect(screen.getByText("Sending your request...")).toBeInTheDocument();
  });

  it("disables submit button when isSubmitting", () => {
    render(<BookingForm {...defaultProps} isSubmitting={true} />);
    expect(screen.getByText("Sending your request...")).toBeDisabled();
  });

  it("shows validation errors when submitting empty form", async () => {
    render(<BookingForm {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /Request Your Butler/i }));
    await waitFor(() => {
      expect(screen.getByText("Name is required")).toBeInTheDocument();
    });
  });

  it("rejects a UK mobile number that is one digit short", async () => {
    render(<BookingForm {...defaultProps} />);

    fireEvent.click(screen.getByRole("radio", { name: /Same Day/i }));
    fireEvent.change(screen.getByPlaceholderText("Jane Smith"), {
      target: { value: "Jane Smith" },
    });
    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "jane@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("07700 900000"), {
      target: { value: "07700 90000" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Request Your Butler/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/Phone number is too short for its country/i)
      ).toBeInTheDocument();
    });
    expect(defaultProps.onSubmit).not.toHaveBeenCalled();
  });

  it("submits phone numbers in E.164 format", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<BookingForm {...defaultProps} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("radio", { name: /Same Day/i }));
    fireEvent.change(screen.getByPlaceholderText("Jane Smith"), {
      target: { value: "Jane Smith" },
    });
    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "jane@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("07700 900000"), {
      target: { value: "07700 900000" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Request Your Butler/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ phone: "+447700900000" }),
        expect.anything()
      );
    });
  });

  it("uses accessible radiogroup roles for day options", () => {
    render(<BookingForm {...defaultProps} />);

    const radiogroups = screen.getAllByRole("radiogroup");
    expect(radiogroups.length).toBeGreaterThanOrEqual(2);
  });

  it("renders visible label for Full name field", () => {
    render(<BookingForm {...defaultProps} />);
    const label = screen.getByText("Full name");
    expect(label).toBeVisible();
  });

  it("renders visible label for Email address field", () => {
    render(<BookingForm {...defaultProps} />);
    const label = screen.getByText("Email address");
    expect(label).toBeVisible();
  });

  it("renders visible label for Phone number field", () => {
    render(<BookingForm {...defaultProps} />);
    const label = screen.getByText("Phone number");
    expect(label).toBeVisible();
  });

  it("renders visible label for Additional notes field", () => {
    const { getByText } = render(<BookingForm onSubmit={vi.fn()} isSubmitting={false} />);
    expect(getByText(/Additional notes/i)).toBeVisible();
  });

  describe("pre-fill for logged-in users", () => {
    beforeEach(() => {
      vi.mocked(useAuth).mockReturnValue({
        user: {
          id: "user-1",
          email: "kim@example.com",
          user_metadata: { name: "Kim Butler", phone: "07700 123456" },
        } as never,
        session: null,
        loading: false,
        supabase: {} as never,
        signUp: vi.fn(),
        signIn: vi.fn(),
        signOut: vi.fn(),
      });
    });

    it("pre-fills name, email, and phone from user profile", async () => {
      render(<BookingForm {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Jane Smith")).toHaveValue("Kim Butler");
        expect(screen.getByPlaceholderText("you@example.com")).toHaveValue("kim@example.com");
        expect(screen.getByPlaceholderText("07700 900000")).toHaveValue("07700 123456");
      });
    });

    it("allows editing pre-filled fields", async () => {
      render(<BookingForm {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Jane Smith")).toHaveValue("Kim Butler");
      });

      const nameInput = screen.getByPlaceholderText("Jane Smith");
      fireEvent.change(nameInput, { target: { value: "Someone Else" } });
      expect(nameInput).toHaveValue("Someone Else");
    });
  });

  describe("no pre-fill when logged out", () => {
    beforeEach(() => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        session: null,
        loading: false,
        supabase: {} as never,
        signUp: vi.fn(),
        signIn: vi.fn(),
        signOut: vi.fn(),
      });
    });

    it("leaves fields empty when no user", () => {
      render(<BookingForm {...defaultProps} />);

      expect(screen.getByPlaceholderText("Jane Smith")).toHaveValue("");
      expect(screen.getByPlaceholderText("you@example.com")).toHaveValue("");
      expect(screen.getByPlaceholderText("07700 900000")).toHaveValue("");
    });
  });
});
