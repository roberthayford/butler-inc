import { describe, it, expect, vi, afterEach } from "vitest";

describe("getPaymentGateway production safety", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("throws if PAYMENT_GATEWAY=mock in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PAYMENT_GATEWAY", "mock");

    const { getPaymentGateway } = await import("../gateway");
    expect(() => getPaymentGateway()).toThrow("Mock payment gateway cannot be used in production");
  });

  it("allows mock gateway in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("PAYMENT_GATEWAY", "mock");

    const { getPaymentGateway } = await import("../gateway");
    expect(() => getPaymentGateway()).not.toThrow();
  });
});
