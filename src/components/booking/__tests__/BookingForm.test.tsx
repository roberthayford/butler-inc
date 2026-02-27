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

    expect(screen.getByPlaceholderText("Full name")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Email address")
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Phone number")
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Additional notes (optional)")
    ).toBeInTheDocument();
  });

  it("renders submit button", () => {
    render(<BookingForm {...defaultProps} />);

    expect(
      screen.getByText("Submit Booking Request")
    ).toBeInTheDocument();
  });

  it("shows 'Submitting...' when isSubmitting is true", () => {
    render(<BookingForm {...defaultProps} isSubmitting={true} />);

    expect(screen.getByText("Submitting...")).toBeInTheDocument();
  });

  it("disables submit button when isSubmitting", () => {
    render(<BookingForm {...defaultProps} isSubmitting={true} />);

    expect(screen.getByText("Submitting...")).toBeDisabled();
  });

  it("shows validation errors when submitting empty form", async () => {
    render(<BookingForm {...defaultProps} />);

    fireEvent.click(screen.getByText("Submit Booking Request"));

    await waitFor(() => {
      expect(screen.getByText("Name is required")).toBeInTheDocument();
    });
  });

  it("uses accessible radiogroup roles for day options", () => {
    render(<BookingForm {...defaultProps} />);

    const radiogroups = screen.getAllByRole("radiogroup");
    expect(radiogroups.length).toBeGreaterThanOrEqual(2);
  });
});
