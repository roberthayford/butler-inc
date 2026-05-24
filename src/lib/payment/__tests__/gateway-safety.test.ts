import { describe, it, expect, vi, afterEach } from "vitest";

describe("getPaymentGateway production safety", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("throws if PAYMENT_GATEWAY=mock and VERCEL_ENV=production (real Vercel prod)", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("PAYMENT_GATEWAY", "mock");

    const { getPaymentGateway } = await import("../gateway");
    expect(() => getPaymentGateway()).toThrow("Mock payment gateway cannot be used in production");
  });

  it("allows mock gateway when VERCEL_ENV=preview (Vercel staging/preview deploys)", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("PAYMENT_GATEWAY", "mock");

    const { getPaymentGateway } = await import("../gateway");
    expect(() => getPaymentGateway()).not.toThrow();
  });

  it("allows mock gateway when VERCEL_ENV is undefined (local dev or non-Vercel)", async () => {
    vi.stubEnv("PAYMENT_GATEWAY", "mock");
    // Don't stub VERCEL_ENV — it should be undefined for local dev

    const { getPaymentGateway } = await import("../gateway");
    expect(() => getPaymentGateway()).not.toThrow();
  });

  it("allows mock gateway in development mode even with NODE_ENV=production (NODE_ENV is no longer the gate)", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("PAYMENT_GATEWAY", "mock");

    const { getPaymentGateway } = await import("../gateway");
    expect(() => getPaymentGateway()).not.toThrow();
  });
});
