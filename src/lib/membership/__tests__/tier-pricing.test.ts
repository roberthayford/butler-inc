import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("getTierPriceId", () => {
  const envBackup = {
    lite: process.env.STRIPE_PRICE_LITE,
    essential: process.env.STRIPE_PRICE_ESSENTIAL,
    heavy: process.env.STRIPE_PRICE_HEAVY,
  };

  beforeEach(() => {
    vi.resetModules();
    delete process.env.STRIPE_PRICE_LITE;
    delete process.env.STRIPE_PRICE_ESSENTIAL;
    delete process.env.STRIPE_PRICE_HEAVY;
  });

  afterEach(() => {
    if (envBackup.lite !== undefined) process.env.STRIPE_PRICE_LITE = envBackup.lite;
    if (envBackup.essential !== undefined) process.env.STRIPE_PRICE_ESSENTIAL = envBackup.essential;
    if (envBackup.heavy !== undefined) process.env.STRIPE_PRICE_HEAVY = envBackup.heavy;
  });

  it("returns the env var value when set", async () => {
    process.env.STRIPE_PRICE_LITE = "price_real_lite_123";
    const { getTierPriceId } = await import("../tier-pricing");
    expect(getTierPriceId("lite")).toBe("price_real_lite_123");
  });

  it("falls back to mock_<slug> when env var is unset", async () => {
    const { getTierPriceId } = await import("../tier-pricing");
    expect(getTierPriceId("lite")).toBe("mock_lite");
    expect(getTierPriceId("essential")).toBe("mock_essential");
    expect(getTierPriceId("heavy")).toBe("mock_heavy");
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
