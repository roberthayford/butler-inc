import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@/test/test-utils";
import { PriceCalculator } from "../PriceCalculator";

vi.mock("motion/react", () => ({
  motion: {
    div: ({ children, ...props }: Record<string, unknown>) => (
      <div {...props}>{children as React.ReactNode}</div>
    ),
    span: ({ children, ...props }: Record<string, unknown>) => (
      <span {...props}>{children as React.ReactNode}</span>
    ),
  },
  AnimatePresence: ({ children }: Record<string, unknown>) => (
    <>{children as React.ReactNode}</>
  ),
}));

describe("PriceCalculator", () => {
  it("renders empty state when no selections made", () => {
    render(
      <PriceCalculator
        butlerName={null}
        serviceDate={null}
        startTime=""
        endTime=""
        pricePreview={null}
      />
    );
    expect(screen.getByText(/select a date and time/i)).toBeInTheDocument();
  });

  it("renders partial state with butler name and date but no time", () => {
    render(
      <PriceCalculator
        butlerName="Busy Butler"
        serviceDate="2026-03-28"
        startTime=""
        endTime=""
        pricePreview={null}
      />
    );
    expect(screen.getByText("Busy Butler")).toBeInTheDocument();
    expect(screen.getByText(/choose your start and end time/i)).toBeInTheDocument();
  });

  it("renders complete state with standard pricing", () => {
    render(
      <PriceCalculator
        butlerName="Busy Butler"
        serviceDate="2026-03-28"
        startTime="09:00"
        endTime="13:00"
        pricePreview={{
          hourlyRate: 50,
          durationHours: 4,
          urgencyMultiplier: 1.0,
          urgencyLabel: null,
          urgencyColour: null,
          subtotal: 200,
          total: 200,
          breakdown: "£50/hr × 4hrs = £200.00",
        }}
      />
    );
    expect(screen.getByText("£200.00")).toBeInTheDocument();
    expect(screen.getByText(/£50\/hr × 4hrs/)).toBeInTheDocument();
  });

  it("renders urgency premium badge when multiplier > 1", () => {
    render(
      <PriceCalculator
        butlerName="Busy Butler"
        serviceDate="2026-03-28"
        startTime="09:00"
        endTime="13:00"
        pricePreview={{
          hourlyRate: 50,
          durationHours: 4,
          urgencyMultiplier: 1.5,
          urgencyLabel: "Same-day premium",
          urgencyColour: "CC6600",
          subtotal: 200,
          total: 300,
          breakdown: "£50/hr × 4hrs × 1.5 = £300.00",
        }}
      />
    );
    expect(screen.getByText("£300.00")).toBeInTheDocument();
    expect(screen.getByText(/same-day premium/i)).toBeInTheDocument();
  });

  it("renders early-bird discount badge", () => {
    render(
      <PriceCalculator
        butlerName="Busy Butler"
        serviceDate="2026-12-28"
        startTime="09:00"
        endTime="13:00"
        pricePreview={{
          hourlyRate: 50,
          durationHours: 4,
          urgencyMultiplier: 0.95,
          urgencyLabel: "Early-bird discount",
          urgencyColour: "2E8B57",
          subtotal: 200,
          total: 190,
          breakdown: "£50/hr × 4hrs × 0.95 = £190.00",
        }}
      />
    );
    expect(screen.getByText("£190.00")).toBeInTheDocument();
    expect(screen.getByText(/early-bird discount/i)).toBeInTheDocument();
  });

  it("does not render urgency badge when multiplier is 1.0", () => {
    render(
      <PriceCalculator
        butlerName="Busy Butler"
        serviceDate="2026-03-28"
        startTime="09:00"
        endTime="13:00"
        pricePreview={{
          hourlyRate: 50,
          durationHours: 4,
          urgencyMultiplier: 1.0,
          urgencyLabel: null,
          urgencyColour: null,
          subtotal: 200,
          total: 200,
          breakdown: "£50/hr × 4hrs = £200.00",
        }}
      />
    );
    expect(screen.queryByText(/premium/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/discount/i)).not.toBeInTheDocument();
  });

  it("shows duration in the time range", () => {
    render(
      <PriceCalculator
        butlerName="Baby Butler"
        serviceDate="2026-03-28"
        startTime="09:00"
        endTime="12:00"
        pricePreview={{
          hourlyRate: 55,
          durationHours: 3,
          urgencyMultiplier: 1.0,
          urgencyLabel: null,
          urgencyColour: null,
          subtotal: 165,
          total: 165,
          breakdown: "£55/hr × 3hrs = £165.00",
        }}
      />
    );
    expect(screen.getByText(/09:00/)).toBeInTheDocument();
    expect(screen.getByText(/12:00/)).toBeInTheDocument();
    expect(screen.getByText(/3 hours/)).toBeInTheDocument();
  });
});
