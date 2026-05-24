import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("getTierPriceId", () => {
  const envBackup = {
    lite: process.env.STRIPE_PRICE_LITE,
    frequent: process.env.STRIPE_PRICE_FREQUENT,
    pro: process.env.STRIPE_PRICE_PRO,
  };

  beforeEach(() => {
    vi.resetModules();
    delete process.env.STRIPE_PRICE_LITE;
    delete process.env.STRIPE_PRICE_FREQUENT;
    delete process.env.STRIPE_PRICE_PRO;
  });

  afterEach(() => {
    if (envBackup.lite !== undefined) process.env.STRIPE_PRICE_LITE = envBackup.lite;
    if (envBackup.frequent !== undefined) process.env.STRIPE_PRICE_FREQUENT = envBackup.frequent;
    if (envBackup.pro !== undefined) process.env.STRIPE_PRICE_PRO = envBackup.pro;
  });

  it("returns the env var value when set", async () => {
    process.env.STRIPE_PRICE_LITE = "price_real_lite_123";
    const { getTierPriceId } = await import("../tier-pricing");
    expect(getTierPriceId("lite")).toBe("price_real_lite_123");
  });

  it("falls back to mock_<slug> when env var is unset", async () => {
    const { getTierPriceId } = await import("../tier-pricing");
    expect(getTierPriceId("lite")).toBe("mock_lite");
    expect(getTierPriceId("frequent")).toBe("mock_frequent");
    expect(getTierPriceId("pro")).toBe("mock_pro");
  });

  it("falls back to mock_<slug> when env var is set to empty string", async () => {
    process.env.STRIPE_PRICE_LITE = "";
    const { getTierPriceId } = await import("../tier-pricing");
    expect(getTierPriceId("lite")).toBe("mock_lite");
  });

  it("throws for an unknown slug", async () => {
    const { getTierPriceId } = await import("../tier-pricing");
    // @ts-expect-error — testing runtime guard
    expect(() => getTierPriceId("ultra")).toThrow(/unknown tier slug/i);
  });
});
