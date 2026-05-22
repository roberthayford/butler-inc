import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { InMemoryRateLimiter } from "../rate-limit";

describe("InMemoryRateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests under the limit", () => {
    const limiter = new InMemoryRateLimiter({ maxRequests: 5, windowMs: 60_000 });
    for (let i = 0; i < 5; i++) {
      expect(limiter.check("192.168.1.1")).toEqual({ allowed: true, remaining: 5 - i - 1 });
    }
  });

  it("blocks requests over the limit", () => {
    const limiter = new InMemoryRateLimiter({ maxRequests: 3, windowMs: 60_000 });
    limiter.check("192.168.1.1");
    limiter.check("192.168.1.1");
    limiter.check("192.168.1.1");
    expect(limiter.check("192.168.1.1")).toEqual({ allowed: false, remaining: 0 });
  });

  it("tracks different keys independently", () => {
    const limiter = new InMemoryRateLimiter({ maxRequests: 1, windowMs: 60_000 });
    expect(limiter.check("user-a").allowed).toBe(true);
    expect(limiter.check("user-b").allowed).toBe(true);
    expect(limiter.check("user-a").allowed).toBe(false);
  });

  it("resets after the window expires", () => {
    const limiter = new InMemoryRateLimiter({ maxRequests: 1, windowMs: 60_000 });
    expect(limiter.check("192.168.1.1").allowed).toBe(true);
    expect(limiter.check("192.168.1.1").allowed).toBe(false);

    vi.advanceTimersByTime(60_001);

    expect(limiter.check("192.168.1.1").allowed).toBe(true);
  });
});
