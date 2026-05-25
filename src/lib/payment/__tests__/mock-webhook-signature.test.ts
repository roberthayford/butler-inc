import { afterEach, describe, expect, it } from "vitest";
import { signMockWebhook, verifyMockWebhook } from "../mock-webhook-signature";

const ORIGINAL_SECRET = process.env.MOCK_WEBHOOK_SECRET;

describe("mock webhook signature helpers", () => {
  afterEach(() => {
    if (ORIGINAL_SECRET === undefined) delete process.env.MOCK_WEBHOOK_SECRET;
    else process.env.MOCK_WEBHOOK_SECRET = ORIGINAL_SECRET;
  });

  it("signMockWebhook returns a 64-char hex digest", () => {
    process.env.MOCK_WEBHOOK_SECRET = "test-secret";
    const sig = signMockWebhook('{"hello":"world"}');
    expect(sig).toMatch(/^[a-f0-9]{64}$/);
  });

  it("signMockWebhook throws when MOCK_WEBHOOK_SECRET is unset", () => {
    delete process.env.MOCK_WEBHOOK_SECRET;
    expect(() => signMockWebhook("body")).toThrow(/MOCK_WEBHOOK_SECRET/);
  });

  it("verifyMockWebhook accepts a signature produced by signMockWebhook for the same body", () => {
    process.env.MOCK_WEBHOOK_SECRET = "test-secret";
    const body = '{"type":"customer.subscription.updated"}';
    const sig = signMockWebhook(body);
    expect(verifyMockWebhook(body, sig)).toBe(true);
  });

  it("verifyMockWebhook rejects a signature computed for a different body", () => {
    process.env.MOCK_WEBHOOK_SECRET = "test-secret";
    const sig = signMockWebhook("body-A");
    expect(verifyMockWebhook("body-B", sig)).toBe(false);
  });

  it("verifyMockWebhook rejects a signature computed with a different secret", () => {
    process.env.MOCK_WEBHOOK_SECRET = "secret-A";
    const sig = signMockWebhook("body");
    process.env.MOCK_WEBHOOK_SECRET = "secret-B";
    expect(verifyMockWebhook("body", sig)).toBe(false);
  });

  it("verifyMockWebhook rejects a null/missing signature", () => {
    process.env.MOCK_WEBHOOK_SECRET = "test-secret";
    expect(verifyMockWebhook("body", null)).toBe(false);
    expect(verifyMockWebhook("body", "")).toBe(false);
  });

  it("verifyMockWebhook returns false when MOCK_WEBHOOK_SECRET is unset (fail closed)", () => {
    delete process.env.MOCK_WEBHOOK_SECRET;
    expect(verifyMockWebhook("body", "any-signature")).toBe(false);
  });

  it("verifyMockWebhook rejects the literal '1' (closes the pre-fix accept-any-value gate)", () => {
    process.env.MOCK_WEBHOOK_SECRET = "test-secret";
    expect(verifyMockWebhook("body", "1")).toBe(false);
  });

  it("verifyMockWebhook rejects a signature of wrong length without throwing in timingSafeEqual", () => {
    // timingSafeEqual throws on unequal-length buffers; the length-guard must run first.
    process.env.MOCK_WEBHOOK_SECRET = "test-secret";
    expect(verifyMockWebhook("body", "deadbeef")).toBe(false);
  });
});
