import { describe, it, expect } from "vitest";
import {
  hasPeriodExpired,
  advancePeriod,
  resetUsageForNewPeriod,
} from "../period-rollover";

const TODAY = "2026-05-24";

describe("hasPeriodExpired", () => {
  it("returns true when billingPeriodEnd is before today", () => {
    expect(hasPeriodExpired("2026-04-30", TODAY)).toBe(true);
  });

  it("returns true when billingPeriodEnd is today (period ended yesterday inclusive)", () => {
    // Convention: if today === billingPeriodEnd, the period covers TODAY,
    // and ends at end-of-day. So today === end means NOT expired.
    expect(hasPeriodExpired(TODAY, TODAY)).toBe(false);
  });

  it("returns false when billingPeriodEnd is in the future", () => {
    expect(hasPeriodExpired("2026-06-15", TODAY)).toBe(false);
  });

  it("handles end-of-month boundary correctly", () => {
    expect(hasPeriodExpired("2026-05-23", TODAY)).toBe(true);
    expect(hasPeriodExpired("2026-05-25", TODAY)).toBe(false);
  });
});

describe("advancePeriod", () => {
  it("advances to the calendar month containing today", () => {
    const result = advancePeriod({
      billingPeriodStart: "2026-04-01",
      billingPeriodEnd: "2026-04-30",
      today: TODAY,
    });
    // Calendar-month aligned: May 1 → May 31
    expect(result.billingPeriodStart).toBe("2026-05-01");
    expect(result.billingPeriodEnd).toBe("2026-05-31");
  });

  it("snaps a multi-month-stale period to the calendar month containing today", () => {
    const result = advancePeriod({
      billingPeriodStart: "2026-02-01",
      billingPeriodEnd: "2026-02-28",
      today: TODAY,
    });
    expect(result.billingPeriodStart).toBe("2026-05-01");
    expect(result.billingPeriodEnd).toBe("2026-05-31");
  });

  it("snaps a mid-month period to the calendar month containing today (normalisation)", () => {
    // Old day-anchored period: Apr 15 → May 14. After today (May 24) lands in May,
    // we snap to May 1 → May 31 rather than drift.
    const result = advancePeriod({
      billingPeriodStart: "2026-04-15",
      billingPeriodEnd: "2026-05-14",
      today: TODAY,
    });
    expect(result.billingPeriodStart).toBe("2026-05-01");
    expect(result.billingPeriodEnd).toBe("2026-05-31");
  });

  it("handles 31st-day signups without drift (the bug)", () => {
    // Previously: Jan 31 start → setUTCMonth(+1) normalises Feb 31 → Mar 3
    // → minus 1 day → Mar 2. Then each subsequent rollover drifted further.
    // With calendar-month: snap straight to today's month.
    const result = advancePeriod({
      billingPeriodStart: "2026-01-31",
      billingPeriodEnd: "2026-03-02", // the buggy old end
      today: TODAY,
    });
    expect(result.billingPeriodStart).toBe("2026-05-01");
    expect(result.billingPeriodEnd).toBe("2026-05-31");
  });

  it("handles February (28 days) correctly", () => {
    const result = advancePeriod({
      billingPeriodStart: "2026-01-01",
      billingPeriodEnd: "2026-01-31",
      today: "2026-02-15",
    });
    expect(result.billingPeriodStart).toBe("2026-02-01");
    expect(result.billingPeriodEnd).toBe("2026-02-28");
  });

  it("handles February in a leap year (29 days)", () => {
    const result = advancePeriod({
      billingPeriodStart: "2028-01-01",
      billingPeriodEnd: "2028-01-31",
      today: "2028-02-15",
    });
    expect(result.billingPeriodStart).toBe("2028-02-01");
    expect(result.billingPeriodEnd).toBe("2028-02-29");
  });
});

describe("resetUsageForNewPeriod", () => {
  it("returns zero used counters and a fresh period when expired", () => {
    const result = resetUsageForNewPeriod(
      {
        personalHoursUsed: 8.5,
        virtualTasksUsed: 4,
        billingPeriodStart: "2026-04-01",
        billingPeriodEnd: "2026-04-30",
      },
      TODAY
    );
    expect(result.personalHoursUsed).toBe(0);
    expect(result.virtualTasksUsed).toBe(0);
    expect(result.billingPeriodStart).toBe("2026-05-01");
    expect(result.billingPeriodEnd).toBe("2026-05-31");
  });

  it("returns unchanged data when period not expired", () => {
    const input = {
      personalHoursUsed: 3,
      virtualTasksUsed: 2,
      billingPeriodStart: "2026-05-01",
      billingPeriodEnd: "2026-05-31",
    };
    expect(resetUsageForNewPeriod(input, TODAY)).toEqual(input);
  });

  it("handles a Jan-31 signup that previously drifted (now snaps to calendar month)", () => {
    const result = resetUsageForNewPeriod(
      {
        personalHoursUsed: 12,
        virtualTasksUsed: 6,
        billingPeriodStart: "2026-01-31",
        billingPeriodEnd: "2026-03-02", // the buggy old end
      },
      TODAY
    );
    expect(result.billingPeriodStart).toBe("2026-05-01");
    expect(result.billingPeriodEnd).toBe("2026-05-31");
    expect(result.personalHoursUsed).toBe(0);
    expect(result.virtualTasksUsed).toBe(0);
  });
});
