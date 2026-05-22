import { describe, it, expect } from "vitest";
import {
  calculateDurationHours,
  validateBookingTime,
  determineUrgencyMultiplier,
  calculatePricePreview,
} from "../calculate-price";
import type { UrgencyMultiplier } from "../types";

const URGENCY_MULTIPLIERS: UrgencyMultiplier[] = [
  {
    id: "same_day",
    label: "Same-day premium",
    minHoursNotice: null,
    maxHoursNotice: 12,
    multiplier: 1.5,
    displayColour: "CC6600",
    isActive: true,
  },
  {
    id: "next_day",
    label: "Next-day premium",
    minHoursNotice: 12,
    maxHoursNotice: 36,
    multiplier: 1.25,
    displayColour: "CC8800",
    isActive: true,
  },
  {
    id: "standard",
    label: null,
    minHoursNotice: 36,
    maxHoursNotice: 168,
    multiplier: 1.0,
    displayColour: null,
    isActive: true,
  },
  {
    id: "early_bird",
    label: "Early-bird discount",
    minHoursNotice: 168,
    maxHoursNotice: null,
    multiplier: 0.95,
    displayColour: "2E8B57",
    isActive: true,
  },
];

describe("calculateDurationHours", () => {
  it("calculates whole-hour durations", () => {
    expect(calculateDurationHours("09:00", "13:00")).toBe(4);
  });

  it("calculates fractional durations (15-min increments)", () => {
    expect(calculateDurationHours("09:00", "10:30")).toBe(1.5);
    expect(calculateDurationHours("09:00", "09:15")).toBe(0.25);
    expect(calculateDurationHours("09:00", "11:45")).toBe(2.75);
  });

  it("handles full-day range", () => {
    expect(calculateDurationHours("06:00", "23:00")).toBe(17);
  });

  it("returns 0 when start equals end", () => {
    expect(calculateDurationHours("09:00", "09:00")).toBe(0);
  });

  it("returns negative when end is before start", () => {
    expect(calculateDurationHours("13:00", "09:00")).toBe(-4);
  });
});

describe("validateBookingTime", () => {
  it("passes for valid booking within operating hours", () => {
    const result = validateBookingTime("09:00", "13:00", 2, "2026-12-25");
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("rejects end time before start time", () => {
    const result = validateBookingTime("13:00", "09:00", 2, "2026-12-25");
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/after start/i);
  });

  it("rejects when end equals start", () => {
    const result = validateBookingTime("09:00", "09:00", 2, "2026-12-25");
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/after start/i);
  });

  it("rejects start time before 06:00", () => {
    const result = validateBookingTime("05:45", "09:00", 2, "2026-12-25");
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/06:00/);
  });

  it("rejects end time after 23:00", () => {
    const result = validateBookingTime("09:00", "23:15", 2, "2026-12-25");
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/23:00/);
  });

  it("accepts boundary times (06:00 start, 23:00 end)", () => {
    const result = validateBookingTime("06:00", "23:00", 2, "2026-12-25");
    expect(result.valid).toBe(true);
  });

  it("rejects duration below minimum hours", () => {
    const result = validateBookingTime("09:00", "10:00", 2, "2026-12-25");
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/minimum/i);
  });

  it("accepts duration exactly equal to minimum hours", () => {
    const result = validateBookingTime("09:00", "12:00", 3, "2026-12-25");
    expect(result.valid).toBe(true);
  });

  it("skips minimum hours check when minimumHours is null (consultation)", () => {
    const result = validateBookingTime("09:00", "10:00", null, "2026-12-25");
    expect(result.valid).toBe(true);
  });

  it("rejects bookings under the configured lead time using a UTC instant", () => {
    const result = validateBookingTime(
      "12:00",
      "14:00",
      2,
      "2026-12-25",
      4,
      "2026-12-25T12:00:00.000Z",
      new Date("2026-12-25T09:00:01.000Z")
    );

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/4 hours/i);
  });

  it("accepts bookings at the configured lead time boundary", () => {
    const result = validateBookingTime(
      "13:00",
      "15:00",
      2,
      "2026-12-25",
      4,
      "2026-12-25T13:00:00.000Z",
      new Date("2026-12-25T09:00:00.000Z")
    );

    expect(result.valid).toBe(true);
  });
});

describe("determineUrgencyMultiplier", () => {
  it("returns same-day premium for < 12 hours notice", () => {
    const result = determineUrgencyMultiplier(6, URGENCY_MULTIPLIERS);
    expect(result.multiplier).toBe(1.5);
    expect(result.label).toBe("Same-day premium");
    expect(result.displayColour).toBe("CC6600");
  });

  it("returns next-day premium for 12-36 hours notice", () => {
    const result = determineUrgencyMultiplier(24, URGENCY_MULTIPLIERS);
    expect(result.multiplier).toBe(1.25);
    expect(result.label).toBe("Next-day premium");
  });

  it("returns standard rate for 36-168 hours notice", () => {
    const result = determineUrgencyMultiplier(72, URGENCY_MULTIPLIERS);
    expect(result.multiplier).toBe(1.0);
    expect(result.label).toBeNull();
  });

  it("returns early-bird discount for >= 168 hours notice", () => {
    const result = determineUrgencyMultiplier(200, URGENCY_MULTIPLIERS);
    expect(result.multiplier).toBe(0.95);
    expect(result.label).toBe("Early-bird discount");
    expect(result.displayColour).toBe("2E8B57");
  });

  it("handles boundary: exactly 12 hours goes to next-day", () => {
    const result = determineUrgencyMultiplier(12, URGENCY_MULTIPLIERS);
    expect(result.multiplier).toBe(1.25);
  });

  it("handles boundary: exactly 36 hours goes to standard", () => {
    const result = determineUrgencyMultiplier(36, URGENCY_MULTIPLIERS);
    expect(result.multiplier).toBe(1.0);
  });

  it("handles boundary: exactly 168 hours goes to early-bird", () => {
    const result = determineUrgencyMultiplier(168, URGENCY_MULTIPLIERS);
    expect(result.multiplier).toBe(0.95);
  });

  it("defaults to 1.0 multiplier if no match found", () => {
    const result = determineUrgencyMultiplier(50, []);
    expect(result.multiplier).toBe(1.0);
    expect(result.label).toBeNull();
  });
});

describe("calculatePricePreview", () => {
  it("calculates standard rate: 4hrs x £50/hr = £200", () => {
    const result = calculatePricePreview({
      hourlyRate: 50,
      startTime: "09:00",
      endTime: "13:00",
      serviceDate: "2026-12-25",
      multipliers: URGENCY_MULTIPLIERS,
    });
    expect(result.durationHours).toBe(4);
    expect(result.subtotal).toBe(200);
    expect(result.hourlyRate).toBe(50);
  });

  it("calculates with same-day urgency: 4hrs x £50/hr x 1.5 = £300", () => {
    const now = new Date();
    const sameDay = now.toISOString().split("T")[0];
    const futureHour = Math.min(now.getHours() + 2, 20);
    const startTime = `${String(futureHour).padStart(2, "0")}:00`;
    const endHour = Math.min(futureHour + 4, 23);
    const endTime = `${String(endHour).padStart(2, "0")}:00`;

    const result = calculatePricePreview({
      hourlyRate: 50,
      startTime,
      endTime,
      serviceDate: sameDay,
      multipliers: URGENCY_MULTIPLIERS,
    });
    expect(result.urgencyMultiplier).toBe(1.5);
    expect(result.total).toBe(
      Math.round(50 * result.durationHours * 1.5 * 100) / 100
    );
  });

  it("calculates with early-bird discount: 4hrs x £50/hr x 0.95 = £190", () => {
    const farFuture = new Date();
    farFuture.setDate(farFuture.getDate() + 14);
    const serviceDate = farFuture.toISOString().split("T")[0];

    const result = calculatePricePreview({
      hourlyRate: 50,
      startTime: "09:00",
      endTime: "13:00",
      serviceDate,
      multipliers: URGENCY_MULTIPLIERS,
    });
    expect(result.durationHours).toBe(4);
    expect(result.urgencyMultiplier).toBe(0.95);
    expect(result.total).toBe(190);
    expect(result.subtotal).toBe(200);
  });

  it("generates a human-readable breakdown string", () => {
    const farFuture = new Date();
    farFuture.setDate(farFuture.getDate() + 5);
    const serviceDate = farFuture.toISOString().split("T")[0];

    const result = calculatePricePreview({
      hourlyRate: 50,
      startTime: "09:00",
      endTime: "13:00",
      serviceDate,
      multipliers: URGENCY_MULTIPLIERS,
    });
    expect(result.breakdown).toContain("£50");
    expect(result.breakdown).toContain("4");
    expect(result.breakdown).toContain("£200");
  });

  it("includes multiplier in breakdown when not 1.0", () => {
    const farFuture = new Date();
    farFuture.setDate(farFuture.getDate() + 14);
    const serviceDate = farFuture.toISOString().split("T")[0];

    const result = calculatePricePreview({
      hourlyRate: 50,
      startTime: "09:00",
      endTime: "13:00",
      serviceDate,
      multipliers: URGENCY_MULTIPLIERS,
    });
    expect(result.breakdown).toContain("0.95");
  });

  it("rounds total to 2 decimal places", () => {
    const farFuture = new Date();
    farFuture.setDate(farFuture.getDate() + 14);
    const serviceDate = farFuture.toISOString().split("T")[0];

    const result = calculatePricePreview({
      hourlyRate: 55,
      startTime: "09:00",
      endTime: "12:00",
      serviceDate,
      multipliers: URGENCY_MULTIPLIERS,
    });
    // 55 * 3 * 0.95 = 156.75
    expect(result.total).toBe(156.75);
    expect(Number.isFinite(result.total)).toBe(true);
  });

  it("handles baby butler rate: 3hrs x £55/hr = £165", () => {
    const farFuture = new Date();
    farFuture.setDate(farFuture.getDate() + 5);
    const serviceDate = farFuture.toISOString().split("T")[0];

    const result = calculatePricePreview({
      hourlyRate: 55,
      startTime: "09:00",
      endTime: "12:00",
      serviceDate,
      multipliers: URGENCY_MULTIPLIERS,
    });
    expect(result.subtotal).toBe(165);
    expect(result.total).toBe(165);
  });

  it("handles budget butler rate: 2hrs x £35/hr = £70", () => {
    const farFuture = new Date();
    farFuture.setDate(farFuture.getDate() + 5);
    const serviceDate = farFuture.toISOString().split("T")[0];

    const result = calculatePricePreview({
      hourlyRate: 35,
      startTime: "10:00",
      endTime: "12:00",
      serviceDate,
      multipliers: URGENCY_MULTIPLIERS,
    });
    expect(result.subtotal).toBe(70);
    expect(result.total).toBe(70);
  });
});
