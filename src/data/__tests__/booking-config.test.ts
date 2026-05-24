import { describe, it, expect } from "vitest";
import { DAY_OPTIONS, TIME_SLOTS } from "../booking-config";

describe("DAY_OPTIONS", () => {
  it("has exactly 3 tiers", () => {
    expect(DAY_OPTIONS).toHaveLength(3);
  });

  it("has correct keys", () => {
    const keys = DAY_OPTIONS.map((o) => o.key);
    expect(keys).toEqual(["sameDay", "nextDay", "advance"]);
  });

  it("has correct prices: 70, 55, 50", () => {
    const prices = DAY_OPTIONS.map((o) => o.priceFrom);
    expect(prices).toEqual([70, 55, 50]);
  });

  it("only advance option requires date picker", () => {
    const withDatePicker = DAY_OPTIONS.filter(
      (o) => "requiresDatePicker" in o && o.requiresDatePicker
    );
    expect(withDatePicker).toHaveLength(1);
    expect(withDatePicker[0].key).toBe("advance");
  });
});

describe("TIME_SLOTS", () => {
  it("has exactly 3 slots", () => {
    expect(TIME_SLOTS).toHaveLength(3);
  });

  it("has correct keys", () => {
    const keys = TIME_SLOTS.map((s) => s.key);
    expect(keys).toEqual(["morning", "noon", "evening"]);
  });
});
