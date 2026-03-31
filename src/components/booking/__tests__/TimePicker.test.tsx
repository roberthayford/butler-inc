import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@/test/test-utils";
import { TimePicker } from "../TimePicker";

vi.mock("motion/react", () => ({
  motion: {
    div: ({ children, ...props }: Record<string, unknown>) => (
      <div {...props}>{children as React.ReactNode}</div>
    ),
  },
}));

const SLOTS = ["09:00", "09:15", "09:30", "10:00", "10:15"];

describe("TimePicker", () => {
  it("renders with label", () => {
    render(
      <TimePicker
        label="Start time"
        slots={SLOTS}
        value=""
        onChange={() => {}}
      />
    );
    expect(screen.getByText("Start time")).toBeInTheDocument();
  });

  it("renders all time slot options", () => {
    render(
      <TimePicker
        label="Start time"
        slots={SLOTS}
        value=""
        onChange={() => {}}
      />
    );
    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();
    // Options: placeholder + 5 slots
    expect(select.querySelectorAll("option")).toHaveLength(6);
  });

  it("calls onChange when a slot is selected", () => {
    const handleChange = vi.fn();
    render(
      <TimePicker
        label="Start time"
        slots={SLOTS}
        value=""
        onChange={handleChange}
      />
    );
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "09:15" } });
    expect(handleChange).toHaveBeenCalledWith("09:15");
  });

  it("shows selected value", () => {
    render(
      <TimePicker
        label="Start time"
        slots={SLOTS}
        value="09:30"
        onChange={() => {}}
      />
    );
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("09:30");
  });

  it("can be disabled", () => {
    render(
      <TimePicker
        label="End time"
        slots={SLOTS}
        value=""
        onChange={() => {}}
        disabled
      />
    );
    const select = screen.getByRole("combobox");
    expect(select).toBeDisabled();
  });

  it("renders empty state when no slots available", () => {
    render(
      <TimePicker
        label="Start time"
        slots={[]}
        value=""
        onChange={() => {}}
      />
    );
    expect(screen.getByText(/no times/i)).toBeInTheDocument();
  });
});
