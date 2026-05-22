import { describe, it, expect, vi, afterEach } from "vitest";
import {
  generateTimeSlots,
  getAvailableEndTimes,
  filterPastTimes,
  filterSlotsByLeadTime,
  formatDuration,
  localDateTimeToUtcIso,
  timeToMinutes,
  minutesToTime,
} from "../time-slots";

describe("timeToMinutes", () => {
  it("converts 00:00 to 0", () => {
    expect(timeToMinutes("00:00")).toBe(0);
  });

  it("converts 09:00 to 540", () => {
    expect(timeToMinutes("09:00")).toBe(540);
  });

  it("converts 23:00 to 1380", () => {
    expect(timeToMinutes("23:00")).toBe(1380);
  });

  it("converts 09:15 to 555", () => {
    expect(timeToMinutes("09:15")).toBe(555);
  });
});

describe("minutesToTime", () => {
  it("converts 0 to 00:00", () => {
    expect(minutesToTime(0)).toBe("00:00");
  });

  it("converts 540 to 09:00", () => {
    expect(minutesToTime(540)).toBe("09:00");
  });

  it("converts 555 to 09:15", () => {
    expect(minutesToTime(555)).toBe("09:15");
  });

  it("converts 1380 to 23:00", () => {
    expect(minutesToTime(1380)).toBe("23:00");
  });
});

describe("generateTimeSlots", () => {
  it("generates slots from 06:00 to 22:00 in 15-min intervals", () => {
    const slots = generateTimeSlots(6, 22, 15);
    expect(slots[0]).toBe("06:00");
    expect(slots[slots.length - 1]).toBe("22:00");
    expect(slots).toContain("09:15");
    expect(slots).toContain("12:00");
    expect(slots).toContain("17:45");
  });

  it("has correct count for default range", () => {
    const slots = generateTimeSlots(6, 22, 15);
    // 06:00 to 22:00 = 16 hours * 4 slots/hr + 1 (inclusive end) = 65
    expect(slots.length).toBe(65);
  });

  it("supports 30-minute intervals", () => {
    const slots = generateTimeSlots(9, 12, 30);
    expect(slots).toEqual(["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00"]);
  });

  it("supports 60-minute intervals", () => {
    const slots = generateTimeSlots(9, 12, 60);
    expect(slots).toEqual(["09:00", "10:00", "11:00", "12:00"]);
  });

  it("stops at endHour:00 (does not generate sub-hour past endHour)", () => {
    const slots = generateTimeSlots(21, 22, 15);
    expect(slots[slots.length - 1]).toBe("22:00");
    expect(slots).not.toContain("22:15");
  });
});

describe("getAvailableEndTimes", () => {
  it("returns end times starting from startTime + minimumHours", () => {
    const endTimes = getAvailableEndTimes("09:00", 2, 23);
    expect(endTimes[0]).toBe("11:00");
    expect(endTimes).not.toContain("10:45");
  });

  it("respects minimum 3-hour booking (baby butler)", () => {
    const endTimes = getAvailableEndTimes("09:00", 3, 23);
    expect(endTimes[0]).toBe("12:00");
  });

  it("respects minimum 1-hour booking (budget butler)", () => {
    const endTimes = getAvailableEndTimes("09:00", 1, 23);
    expect(endTimes[0]).toBe("10:00");
  });

  it("caps at maxEndHour", () => {
    const endTimes = getAvailableEndTimes("09:00", 2, 23);
    expect(endTimes[endTimes.length - 1]).toBe("23:00");
    expect(endTimes).not.toContain("23:15");
  });

  it("returns empty array when start + minimum exceeds maxEndHour", () => {
    const endTimes = getAvailableEndTimes("22:00", 2, 23);
    expect(endTimes).toEqual([]);
  });

  it("returns 15-minute increments", () => {
    const endTimes = getAvailableEndTimes("09:00", 2, 23);
    expect(endTimes[0]).toBe("11:00");
    expect(endTimes[1]).toBe("11:15");
    expect(endTimes[2]).toBe("11:30");
  });
});

describe("filterPastTimes", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns all slots for a future date", () => {
    const slots = ["06:00", "09:00", "12:00", "18:00"];
    const result = filterPastTimes(slots, "2099-12-25");
    expect(result).toEqual(slots);
  });

  it("filters out past times for today", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T10:30:00"));

    const slots = ["06:00", "09:00", "10:00", "10:30", "11:00", "12:00"];
    const today = "2026-06-15";
    const result = filterPastTimes(slots, today);

    expect(result).not.toContain("06:00");
    expect(result).not.toContain("09:00");
    expect(result).not.toContain("10:00");
    expect(result).not.toContain("10:30");
    expect(result).toContain("11:00");
    expect(result).toContain("12:00");
  });
});

describe("filterSlotsByLeadTime", () => {
  it("filters slots that are under the configured lead time", () => {
    const slots = ["10:00", "12:00", "14:00"];
    const result = filterSlotsByLeadTime(
      slots,
      "2026-06-15",
      4,
      new Date("2026-06-15T09:00:00")
    );

    expect(result).toEqual(["14:00"]);
  });

  it("keeps all slots when lead time is zero", () => {
    const slots = ["10:00", "12:00"];
    const result = filterSlotsByLeadTime(
      slots,
      "2026-06-15",
      0,
      new Date("2026-06-15T09:00:00")
    );

    expect(result).toEqual(slots);
  });
});

describe("localDateTimeToUtcIso", () => {
  it("returns a UTC ISO timestamp for a locally selected date and time", () => {
    const result = localDateTimeToUtcIso("2026-06-15", "10:30");

    expect(result).toMatch(/2026-06-15T\d{2}:30:00\.000Z/);
  });
});

describe("formatDuration", () => {
  it("formats whole hours", () => {
    expect(formatDuration(4)).toBe("4 hours");
  });

  it("formats singular hour", () => {
    expect(formatDuration(1)).toBe("1 hour");
  });

  it("formats hours and minutes", () => {
    expect(formatDuration(2.5)).toBe("2 hours 30 minutes");
  });

  it("formats 15-minute fraction", () => {
    expect(formatDuration(1.25)).toBe("1 hour 15 minutes");
  });

  it("formats 45-minute fraction", () => {
    expect(formatDuration(3.75)).toBe("3 hours 45 minutes");
  });

  it("formats zero", () => {
    expect(formatDuration(0)).toBe("0 hours");
  });
});
