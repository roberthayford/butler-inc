import { describe, it, expect, vi, afterEach } from "vitest";
import { generateBookingReference } from "../booking-reference";

describe("generateBookingReference", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts with BI- prefix", () => {
    const ref = generateBookingReference();
    expect(ref.startsWith("BI-")).toBe(true);
  });

  it("contains the current date in YYYYMMDD format", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-28T12:00:00"));

    const ref = generateBookingReference();
    expect(ref).toContain("20260328");
  });

  it("matches the format BI-YYYYMMDD-XXXX", () => {
    const ref = generateBookingReference();
    expect(ref).toMatch(/^BI-\d{8}-[A-Z0-9]{4}$/);
  });

  it("generates unique references", () => {
    const refs = new Set(Array.from({ length: 100 }, () => generateBookingReference()));
    expect(refs.size).toBeGreaterThan(90);
  });

  it("has the correct total length", () => {
    const ref = generateBookingReference();
    // BI- (3) + YYYYMMDD (8) + - (1) + XXXX (4) = 16
    expect(ref.length).toBe(16);
  });
});
