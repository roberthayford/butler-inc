import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@/test/test-utils";
import { BookingFlow } from "../BookingFlow";

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
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

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

describe("BookingFlow", () => {
  it("renders the service selection phase initially", () => {
    render(<BookingFlow butlerType="busy" />);

    expect(screen.getByText("Choose a service")).toBeInTheDocument();
  });

  it("transitions to form phase after selecting a service", () => {
    render(<BookingFlow butlerType="busy" />);

    fireEvent.click(screen.getByText("Courier and package services"));

    expect(screen.getByText(/Continue to Payment/)).toBeInTheDocument();
    expect(screen.getByText("Change")).toBeInTheDocument();
  });

  it("shows selected service label in form phase", () => {
    render(<BookingFlow butlerType="busy" />);

    fireEvent.click(screen.getByText("Courier and package services"));

    expect(
      screen.getByText("Courier and package services")
    ).toBeInTheDocument();
  });

  it("returns to service phase when Change is clicked", () => {
    render(<BookingFlow butlerType="busy" />);

    fireEvent.click(screen.getByText("Courier and package services"));
    fireEvent.click(screen.getByText("Change"));

    expect(screen.getByText("Choose a service")).toBeInTheDocument();
  });

  it("renders bespoke flow with custom description", () => {
    render(<BookingFlow butlerType="bespoke" />);

    expect(screen.getByText("Describe your request")).toBeInTheDocument();
  });

  it("has aria-live region for phase transitions", () => {
    const { container } = render(<BookingFlow butlerType="busy" />);

    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
  });
});
