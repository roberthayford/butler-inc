import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DevBookingStore } from "../dev-booking-store";

describe("getBookingRepository", () => {
  const originalEnv = process.env.DEV_BYPASS_DB;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.DEV_BYPASS_DB;
    } else {
      process.env.DEV_BYPASS_DB = originalEnv;
    }
    vi.resetModules();
  });

  it("returns a DevBookingStore when DEV_BYPASS_DB is true", async () => {
    process.env.DEV_BYPASS_DB = "true";
    const { getBookingRepository } = await import("../booking-repository");
    const repo = getBookingRepository();
    expect(repo).toBeInstanceOf(DevBookingStore);
  });

  it("returns the same DevBookingStore instance across calls (singleton)", async () => {
    process.env.DEV_BYPASS_DB = "true";
    const { getBookingRepository } = await import("../booking-repository");
    const a = getBookingRepository();
    const b = getBookingRepository();
    expect(a).toBe(b);
  });

  it("returns a non-DevBookingStore when DEV_BYPASS_DB is not set", async () => {
    delete process.env.DEV_BYPASS_DB;
    const { getBookingRepository } = await import("../booking-repository");
    const repo = getBookingRepository();
    expect(repo).not.toBeInstanceOf(DevBookingStore);
  });
});
