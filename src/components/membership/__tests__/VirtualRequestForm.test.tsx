import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@/test/test-utils";
import { VirtualRequestForm } from "../VirtualRequestForm";

describe("VirtualRequestForm", () => {
  const onSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders category selector with all options", () => {
    render(<VirtualRequestForm onSubmit={onSubmit} isSubmitting={false} />);
    expect(screen.getByText("Appointment Booking")).toBeInTheDocument();
    expect(screen.getByText("Taxi & Airport")).toBeInTheDocument();
    expect(screen.getByText("Restaurant Reservation")).toBeInTheDocument();
    expect(screen.getByText("Other Request")).toBeInTheDocument();
  });

  it("renders description textarea", () => {
    render(<VirtualRequestForm onSubmit={onSubmit} isSubmitting={false} />);
    expect(screen.getByLabelText(/What do you need/i)).toBeInTheDocument();
  });

  it("renders optional date and time fields", () => {
    render(<VirtualRequestForm onSubmit={onSubmit} isSubmitting={false} />);
    expect(screen.getByLabelText(/Preferred Date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Preferred Time/i)).toBeInTheDocument();
  });

  it("disables submit when description is empty", () => {
    render(<VirtualRequestForm onSubmit={onSubmit} isSubmitting={false} />);
    const submitBtn = screen.getByRole("button", { name: /Submit Request/i });
    expect(submitBtn).toBeDisabled();
  });

  it("calls onSubmit with form data", () => {
    render(<VirtualRequestForm onSubmit={onSubmit} isSubmitting={false} />);

    // Select category
    fireEvent.click(screen.getByText("Taxi & Airport"));

    // Fill description
    fireEvent.change(screen.getByLabelText(/What do you need/i), {
      target: { value: "Airport pickup from Heathrow T5 at 3pm" },
    });

    // Submit
    const submitBtn = screen.getByRole("button", { name: /Submit Request/i });
    fireEvent.click(submitBtn);

    expect(onSubmit).toHaveBeenCalledWith({
      category: "taxi_airport",
      description: "Airport pickup from Heathrow T5 at 3pm",
      preferredDate: "",
      preferredTime: "",
    });
  });

  it("shows submitting state", () => {
    render(<VirtualRequestForm onSubmit={onSubmit} isSubmitting={true} />);
    expect(screen.getByRole("button", { name: /Submitting/i })).toBeDisabled();
  });
});
