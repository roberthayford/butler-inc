import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StripeGateway } from "../stripe-gateway";

// A loose fake of the narrow StripeLike surface. Each test wires up only the
// methods it exercises; the rest stay undefined and must not be touched.
function fakeClient(partial: Record<string, unknown>) {
  return partial as never;
}

describe("StripeGateway", () => {
  let envBackup: NodeJS.ProcessEnv;

  beforeEach(() => {
    envBackup = { ...process.env };
  });

  afterEach(() => {
    process.env = envBackup;
    vi.restoreAllMocks();
  });

  describe("client configuration", () => {
    it("throws a clear error when STRIPE_SECRET_KEY is missing and no client is injected", async () => {
      delete process.env.STRIPE_SECRET_KEY;
      const gw = new StripeGateway(); // no injected client → lazy real client
      await expect(
        gw.createPortalSession({ customerId: "cus_1", returnUrl: "https://app/return" })
      ).rejects.toThrow(/STRIPE_SECRET_KEY is required/i);
    });
  });

  describe("createPortalSession", () => {
    it("returns the portal url from the injected client", async () => {
      const create = vi
        .fn()
        .mockResolvedValue({ url: "https://billing.stripe.com/p/session/abc" });
      const gw = new StripeGateway(
        fakeClient({ billingPortal: { sessions: { create } } })
      );

      const result = await gw.createPortalSession({
        customerId: "cus_1",
        returnUrl: "https://app/return",
      });

      expect(result).toEqual({ url: "https://billing.stripe.com/p/session/abc" });
      expect(create).toHaveBeenCalledWith({
        customer: "cus_1",
        return_url: "https://app/return",
      });
    });
  });

  describe("createCheckoutSession (one-off booking, payment mode)", () => {
    it("creates a payment-mode session with the amount converted to pence and returns {sessionId,url}", async () => {
      process.env.NEXT_PUBLIC_SITE_URL = "https://staging.butlersinc.com";
      const create = vi.fn().mockResolvedValue({
        id: "cs_test_123",
        url: "https://checkout.stripe.com/c/pay/cs_test_123",
      });
      const gw = new StripeGateway(fakeClient({ checkout: { sessions: { create } } }));

      const result = await gw.createCheckoutSession({
        bookingId: "b1",
        bookingReference: "BUT-XYZ",
        amount: 150.5, // pounds
        currency: "gbp",
        description: "Budget Butler, 2026-07-01, 09:00-12:00 (3 hours)",
        customerEmail: "guest@example.com",
        metadata: { booking_id: "b1", booking_reference: "BUT-XYZ" },
      });

      expect(result).toEqual({
        sessionId: "cs_test_123",
        url: "https://checkout.stripe.com/c/pay/cs_test_123",
      });

      const params = create.mock.calls[0][0];
      expect(params.mode).toBe("payment");
      expect(params.customer_email).toBe("guest@example.com");
      expect(params.client_reference_id).toBe("b1");
      expect(params.metadata).toMatchObject({
        booking_id: "b1",
        booking_reference: "BUT-XYZ",
      });
      // £150.50 → 15050 pence
      expect(params.line_items[0].quantity).toBe(1);
      expect(params.line_items[0].price_data.currency).toBe("gbp");
      expect(params.line_items[0].price_data.unit_amount).toBe(15050);
      expect(params.line_items[0].price_data.product_data.name).toContain("Budget Butler");
      // success/cancel URLs derived from site origin + booking reference
      expect(params.success_url).toContain("https://staging.butlersinc.com/booking-confirmation");
      expect(params.success_url).toContain("ref=BUT-XYZ");
      expect(params.success_url).toContain("session_id={CHECKOUT_SESSION_ID}");
      expect(params.cancel_url).toContain("https://staging.butlersinc.com");
    });
  });

  describe("verifyPayment", () => {
    it("returns verified + paymentIntentId for a paid session", async () => {
      const retrieve = vi
        .fn()
        .mockResolvedValue({ payment_status: "paid", payment_intent: "pi_123" });
      const gw = new StripeGateway(fakeClient({ checkout: { sessions: { retrieve } } }));

      expect(await gw.verifyPayment("cs_test_123")).toEqual({
        verified: true,
        paymentIntentId: "pi_123",
      });
      expect(retrieve).toHaveBeenCalledWith("cs_test_123");
    });

    it("returns not-verified for an unpaid session", async () => {
      const retrieve = vi
        .fn()
        .mockResolvedValue({ payment_status: "unpaid", payment_intent: null });
      const gw = new StripeGateway(fakeClient({ checkout: { sessions: { retrieve } } }));

      expect(await gw.verifyPayment("cs_x")).toEqual({ verified: false });
    });

    it("coerces an expanded payment_intent object to its id", async () => {
      const retrieve = vi
        .fn()
        .mockResolvedValue({ payment_status: "paid", payment_intent: { id: "pi_obj" } });
      const gw = new StripeGateway(fakeClient({ checkout: { sessions: { retrieve } } }));

      expect(await gw.verifyPayment("cs_x")).toEqual({
        verified: true,
        paymentIntentId: "pi_obj",
      });
    });
  });

  describe("createSubscriptionCheckoutSession", () => {
    it("uses customer_email and the priceId line item for a new customer", async () => {
      const create = vi.fn().mockResolvedValue({
        id: "cs_sub_1",
        url: "https://checkout.stripe.com/c/pay/cs_sub_1",
      });
      const gw = new StripeGateway(fakeClient({ checkout: { sessions: { create } } }));

      const result = await gw.createSubscriptionCheckoutSession({
        tier: "lite",
        priceId: "price_lite",
        userId: "user-1",
        customerEmail: "m@example.com",
        successUrl: "https://app/success?session_id={CHECKOUT_SESSION_ID}",
        cancelUrl: "https://app/cancel",
      });

      expect(result).toEqual({
        sessionId: "cs_sub_1",
        url: "https://checkout.stripe.com/c/pay/cs_sub_1",
      });
      const p = create.mock.calls[0][0];
      expect(p.mode).toBe("subscription");
      expect(p.line_items).toEqual([{ price: "price_lite", quantity: 1 }]);
      expect(p.client_reference_id).toBe("user-1");
      expect(p.customer_email).toBe("m@example.com");
      expect(p.customer).toBeUndefined();
      expect(p.success_url).toBe("https://app/success?session_id={CHECKOUT_SESSION_ID}");
      expect(p.cancel_url).toBe("https://app/cancel");
      expect(p.subscription_data.metadata).toMatchObject({
        user_id: "user-1",
        tier: "lite",
      });
    });

    it("reuses an existing customer id and omits customer_email", async () => {
      const create = vi.fn().mockResolvedValue({ id: "cs_sub_2", url: "u" });
      const gw = new StripeGateway(fakeClient({ checkout: { sessions: { create } } }));

      await gw.createSubscriptionCheckoutSession({
        tier: "pro",
        priceId: "price_pro",
        userId: "user-2",
        customerEmail: "x@example.com",
        customerId: "cus_existing",
        successUrl: "s",
        cancelUrl: "c",
      });

      const p = create.mock.calls[0][0];
      expect(p.customer).toBe("cus_existing");
      expect(p.customer_email).toBeUndefined();
    });
  });
});
