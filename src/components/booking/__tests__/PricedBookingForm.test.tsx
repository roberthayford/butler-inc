import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@/test/test-utils";
import { useAuth } from "@/context/AuthContext";
import { PricedBookingForm } from "../PricedBookingForm";

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
    div: ({
      children,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & {
      children: React.ReactNode;
    }) => <div {...props}>{children}</div>,
    button: ({
      children,
      ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
      children: React.ReactNode;
    }) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

const defaultProps = {
  butlerType: "busy" as const,
  pricing: {
    bookingType: "self_service" as const,
    hourlyRate: 50,
    minimumHours: 2,
  },
  serviceName: "Household errands",
  onSubmit: vi.fn(),
  isSubmitting: false,
};

describe("PricedBookingForm", () => {
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
      render(<PricedBookingForm {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Jane Smith")).toHaveValue("Kim Butler");
        expect(screen.getByPlaceholderText("you@example.com")).toHaveValue("kim@example.com");
        expect(screen.getByPlaceholderText("07700 900000")).toHaveValue("07700 123456");
      });
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
      render(<PricedBookingForm {...defaultProps} />);

      expect(screen.getByPlaceholderText("Jane Smith")).toHaveValue("");
      expect(screen.getByPlaceholderText("you@example.com")).toHaveValue("");
      expect(screen.getByPlaceholderText("07700 900000")).toHaveValue("");
    });
  });
});
