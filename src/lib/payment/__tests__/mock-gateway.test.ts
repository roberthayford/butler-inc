import { describe, it, expect } from "vitest";
import { MockPaymentGateway } from "../mock-gateway";
import type { CheckoutSessionRequest } from "@/lib/pricing/types";

const SAMPLE_REQUEST: CheckoutSessionRequest = {
  bookingId: "test-booking-123",
  bookingReference: "BI-20260328-A1B2",
  amount: 200,
  currency: "gbp",
  description: "Busy Butler — Household Errands, 28 Mar 2026, 09:00–13:00 (4 hours)",
  customerEmail: "jane@example.com",
  metadata: {
    butler_type: "busy",
    service_date: "2026-03-28",
    start_time: "09:00",
    end_time: "13:00",
  },
};

describe("MockPaymentGateway", () => {
  it("creates a checkout session with a mock session ID", async () => {
    const gateway = new MockPaymentGateway();
    const result = await gateway.createCheckoutSession(SAMPLE_REQUEST);

    expect(result.sessionId).toMatch(/^mock_session_/);
    expect(result.url).toContain("/payment/simulate");
  });

  it("includes session_id in the redirect URL", async () => {
    const gateway = new MockPaymentGateway();
    const result = await gateway.createCheckoutSession(SAMPLE_REQUEST);

    const url = new URL(result.url, "http://localhost:3000");
    expect(url.searchParams.get("session_id")).toBe(result.sessionId);
  });

  it("includes booking amount in the redirect URL", async () => {
    const gateway = new MockPaymentGateway();
    const result = await gateway.createCheckoutSession(SAMPLE_REQUEST);

    const url = new URL(result.url, "http://localhost:3000");
    expect(url.searchParams.get("amount")).toBe("200");
  });

  it("includes booking reference in the redirect URL", async () => {
    const gateway = new MockPaymentGateway();
    const result = await gateway.createCheckoutSession(SAMPLE_REQUEST);

    const url = new URL(result.url, "http://localhost:3000");
    expect(url.searchParams.get("ref")).toBe("BI-20260328-A1B2");
  });

  it("includes description in the redirect URL", async () => {
    const gateway = new MockPaymentGateway();
    const result = await gateway.createCheckoutSession(SAMPLE_REQUEST);

    const url = new URL(result.url, "http://localhost:3000");
    expect(url.searchParams.get("description")).toBeTruthy();
  });

  it("generates unique session IDs", async () => {
    const gateway = new MockPaymentGateway();
    const ids = new Set<string>();

    for (let i = 0; i < 50; i++) {
      const result = await gateway.createCheckoutSession(SAMPLE_REQUEST);
      ids.add(result.sessionId);
    }

    expect(ids.size).toBe(50);
  });

  it("verifies valid mock session IDs", async () => {
    const gateway = new MockPaymentGateway();
    const session = await gateway.createCheckoutSession(SAMPLE_REQUEST);

    const result = await gateway.verifyPayment(session.sessionId);
    expect(result.verified).toBe(true);
    expect(result.paymentIntentId).toMatch(/^mock_pi_/);
  });

  it("rejects non-mock session IDs", async () => {
    const gateway = new MockPaymentGateway();

    const result = await gateway.verifyPayment("cs_live_abc123");
    expect(result.verified).toBe(false);
    expect(result.paymentIntentId).toBeUndefined();
  });

  it("rejects empty session ID", async () => {
    const gateway = new MockPaymentGateway();

    const result = await gateway.verifyPayment("");
    expect(result.verified).toBe(false);
  });

  it("rejects fabricated mock session IDs not created by this gateway", async () => {
    const gateway = new MockPaymentGateway();
    // This ID has the right prefix but was never created via createCheckoutSession
    const result = await gateway.verifyPayment("mock_session_999_fabricated");
    expect(result.verified).toBe(false);
  });

  it("rejects replaying a session that was already verified", async () => {
    const gateway = new MockPaymentGateway();
    const session = await gateway.createCheckoutSession(SAMPLE_REQUEST);

    // First verification should succeed
    const first = await gateway.verifyPayment(session.sessionId);
    expect(first.verified).toBe(true);

    // Second verification (replay) should fail
    const second = await gateway.verifyPayment(session.sessionId);
    expect(second.verified).toBe(false);
  });
});
