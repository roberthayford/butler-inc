import { describe, it, expect, vi, afterEach } from "vitest";
import { todayUK } from "../today-uk";

afterEach(() => {
  vi.useRealTimers();
});

describe("todayUK", () => {
  it("returns YYYY-MM-DD format", () => {
    expect(todayUK()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns the UK calendar date at 00:30 BST = 23:30 UTC previous day", () => {
    // 2026-06-01 at 00:30 BST = 2026-05-31 23:30 UTC
    // UTC-derived "today" would be 2026-05-31; UK-derived should be 2026-06-01.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-31T23:30:00Z"));
    expect(todayUK()).toBe("2026-06-01");
  });

  it("returns the UK calendar date at 00:30 GMT = 00:30 UTC", () => {
    // 2026-01-15 at 00:30 GMT (UTC+0) = 00:30 UTC. UK and UTC agree.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T00:30:00Z"));
    expect(todayUK()).toBe("2026-01-15");
  });

  it("returns the previous UK calendar date for late-evening BST", () => {
    // 2026-06-01 at 22:30 BST = 21:30 UTC. UK is still on Jun 1.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T21:30:00Z"));
    expect(todayUK()).toBe("2026-06-01");
  });
});
