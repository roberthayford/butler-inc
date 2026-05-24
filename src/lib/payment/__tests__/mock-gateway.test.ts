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

  describe("subscription methods", () => {
    it("createSubscriptionCheckoutSession returns a mock simulator URL with the right params", async () => {
      const gw = new MockPaymentGateway();
      const result = await gw.createSubscriptionCheckoutSession({
        tier: "lite",
        priceId: "mock_lite",
        userId: "user-123",
        customerEmail: "test@example.com",
        successUrl: "https://example.com/success?session_id={CHECKOUT_SESSION_ID}",
        cancelUrl: "https://example.com/membership",
      });
      expect(result.url).toMatch(/\/payment\/simulate\?/);
      expect(result.url).toContain("type=subscription");
      expect(result.url).toContain("tier=lite");
      expect(result.url).toContain("user_id=user-123");
      expect(result.sessionId).toMatch(/^mock_sub_session_/);
    });

    it("createPortalSession returns a mock portal URL", async () => {
      const gw = new MockPaymentGateway();
      const result = await gw.createPortalSession({
        customerId: "mock_cus_123",
        returnUrl: "https://example.com/members/settings",
      });
      expect(result.url).toMatch(/\/payment\/simulate-portal\?/);
      expect(result.url).toContain("customer_id=mock_cus_123");
    });

    it("pauseSubscription + resumeSubscription toggle in-memory state without throwing", async () => {
      const gw = new MockPaymentGateway();
      await expect(gw.pauseSubscription("mock_sub_123")).resolves.toBeUndefined();
      await expect(gw.resumeSubscription("mock_sub_123")).resolves.toBeUndefined();
    });

    it("parseWebhookEvent accepts an unsigned body in mock mode and returns the parsed event", async () => {
      const gw = new MockPaymentGateway();
      const body = JSON.stringify({
        type: "checkout.session.completed",
        created: 1717000000,
        data: { id: "cs_123", client_reference_id: "user-1", customer: "cus_1", subscription: "sub_1", current_period_start: 1717000000, current_period_end: 1719678400, line_items: [{ price: { id: "mock_lite" } }] },
      });
      const event = await gw.parseWebhookEvent(body, null);
      expect(event.type).toBe("checkout.session.completed");
    });

    it("parseWebhookEvent returns { type: 'unhandled' } for unknown event types", async () => {
      const gw = new MockPaymentGateway();
      const body = JSON.stringify({ type: "customer.created", created: 1717000000, data: {} });
      const event = await gw.parseWebhookEvent(body, null);
      expect(event.type).toBe("unhandled");
      expect(event).toMatchObject({ rawType: "customer.created" });
    });

    it("parseWebhookEvent throws for a handled type with missing data field", async () => {
      const gw = new MockPaymentGateway();
      const body = JSON.stringify({ type: "checkout.session.completed", created: 1717000000 });
      await expect(gw.parseWebhookEvent(body, null)).rejects.toThrow(/missing required 'data' field/);
    });
  });
});
