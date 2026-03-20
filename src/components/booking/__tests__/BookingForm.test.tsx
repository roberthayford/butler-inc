import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@/test/test-utils";
import { BookingForm } from "../BookingForm";

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
});
