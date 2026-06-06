import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Stripe from "stripe";
import { StripeGateway, STRIPE_API_VERSION } from "../stripe-gateway";

// A loose fake of the narrow StripeLike surface. Each test wires up only the
// methods it exercises; the rest stay undefined and must not be touched.
function fakeClient(partial: Record<string, unknown>) {
  return partial as never;
}

// A real Stripe instance whose webhooks.constructEvent / generateTestHeaderString
// exercise genuine HMAC verification. Other resources are stubbed via `extra`.
const WEBHOOK_SECRET = "whsec_test_secret";

function realStripe(): Stripe {
  return new Stripe("sk_test_dummy", { apiVersion: STRIPE_API_VERSION });
}

function clientWithRealWebhooks(
  stripe: Stripe,
  extra: Record<string, unknown> = {}
) {
  return fakeClient({
    webhooks: {
      constructEvent: stripe.webhooks.constructEvent.bind(stripe.webhooks),
    },
    ...extra,
  });
}

function signed(stripe: Stripe, body: string): string {
  return stripe.webhooks.generateTestHeaderString({
    payload: body,
    secret: WEBHOOK_SECRET,
  });
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
    it("returns the portal url from the injected client (no configuration when env unset)", async () => {
      delete process.env.STRIPE_PORTAL_CONFIGURATION_ID;
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

    it("passes the explicit portal configuration id when STRIPE_PORTAL_CONFIGURATION_ID is set", async () => {
      process.env.STRIPE_PORTAL_CONFIGURATION_ID = "bpc_123";
      const create = vi.fn().mockResolvedValue({ url: "https://billing.stripe.com/x" });
      const gw = new StripeGateway(
        fakeClient({ billingPortal: { sessions: { create } } })
      );

      await gw.createPortalSession({ customerId: "cus_1", returnUrl: "https://app/return" });

      expect(create).toHaveBeenCalledWith({
        customer: "cus_1",
        return_url: "https://app/return",
        configuration: "bpc_123",
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

  describe("pauseSubscription / resumeSubscription", () => {
    it("pause sets pause_collection behavior=void on the subscription", async () => {
      const update = vi.fn().mockResolvedValue({});
      const gw = new StripeGateway(fakeClient({ subscriptions: { update } }));

      await gw.pauseSubscription("sub_1");

      expect(update).toHaveBeenCalledWith("sub_1", {
        pause_collection: { behavior: "void" },
      });
    });

    it("resume clears pause_collection", async () => {
      const update = vi.fn().mockResolvedValue({});
      const gw = new StripeGateway(fakeClient({ subscriptions: { update } }));

      await gw.resumeSubscription("sub_1");

      expect(update).toHaveBeenCalledWith("sub_1", { pause_collection: "" });
    });
  });

  describe("parseWebhookEvent — signature verification", () => {
    it("rejects when the signature is null", async () => {
      process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;
      const gw = new StripeGateway(clientWithRealWebhooks(realStripe()));

      await expect(gw.parseWebhookEvent("{}", null)).rejects.toThrow(/signature/i);
    });

    it("rejects when STRIPE_WEBHOOK_SECRET is unset", async () => {
      delete process.env.STRIPE_WEBHOOK_SECRET;
      const gw = new StripeGateway(clientWithRealWebhooks(realStripe()));

      await expect(
        gw.parseWebhookEvent("{}", "t=1,v1=deadbeef")
      ).rejects.toThrow(/STRIPE_WEBHOOK_SECRET/);
    });

    it("verifies a genuinely signed payload and returns the parsed event", async () => {
      process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;
      const stripe = realStripe();
      const body = JSON.stringify({
        id: "evt_1",
        type: "payment_intent.succeeded",
        created: 1717000000,
        data: { object: { id: "pi_1" } },
      });
      const gw = new StripeGateway(clientWithRealWebhooks(stripe));

      const event = await gw.parseWebhookEvent(body, signed(stripe, body));

      // An unhandled type proves verification + parsing without exercising mapping.
      expect(event).toEqual({
        type: "unhandled",
        rawType: "payment_intent.succeeded",
        created: 1717000000,
        id: "evt_1",
      });
    });

    it("rejects a tampered body whose signature no longer matches", async () => {
      process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;
      const stripe = realStripe();
      const body = JSON.stringify({
        id: "evt_1",
        type: "payment_intent.succeeded",
        created: 1,
        data: { object: {} },
      });
      const header = signed(stripe, body);
      const gw = new StripeGateway(clientWithRealWebhooks(stripe));

      await expect(gw.parseWebhookEvent(body + " ", header)).rejects.toThrow();
    });
  });

  describe("parseWebhookEvent — event mapping", () => {
    beforeEach(() => {
      process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;
    });

    it("maps customer.subscription.updated, reading periods from the item level", async () => {
      const stripe = realStripe();
      const body = JSON.stringify({
        id: "evt_sub_upd",
        type: "customer.subscription.updated",
        created: 1717001000,
        data: {
          object: {
            id: "sub_1",
            customer: "cus_1",
            status: "active",
            cancel_at_period_end: true,
            pause_collection: null,
            items: {
              data: [
                {
                  price: { id: "price_frequent" },
                  current_period_start: 1717000000,
                  current_period_end: 1719592000,
                },
              ],
            },
          },
        },
      });
      const gw = new StripeGateway(clientWithRealWebhooks(stripe));

      const event = await gw.parseWebhookEvent(body, signed(stripe, body));

      expect(event).toEqual({
        type: "customer.subscription.updated",
        created: 1717001000,
        id: "evt_sub_upd",
        data: {
          id: "sub_1",
          customer: "cus_1",
          status: "active",
          cancel_at_period_end: true,
          current_period_start: 1717000000,
          current_period_end: 1719592000,
          pause_collection: null,
          items: { data: [{ price: { id: "price_frequent" } }] },
        },
      });
    });

    it("maps pause_collection to status 'paused' so the handler keeps it paused", async () => {
      const stripe = realStripe();
      const body = JSON.stringify({
        id: "evt_pause",
        type: "customer.subscription.updated",
        created: 1717001500,
        data: {
          object: {
            id: "sub_1",
            customer: "cus_1",
            status: "active", // Stripe leaves status active when pause_collection is set
            cancel_at_period_end: false,
            pause_collection: { behavior: "void" },
            items: {
              data: [
                {
                  price: { id: "price_lite" },
                  current_period_start: 1,
                  current_period_end: 2,
                },
              ],
            },
          },
        },
      });
      const gw = new StripeGateway(clientWithRealWebhooks(stripe));

      const event = await gw.parseWebhookEvent(body, signed(stripe, body));

      expect(event.type).toBe("customer.subscription.updated");
      if (event.type !== "customer.subscription.updated") throw new Error("narrow");
      expect(event.data.status).toBe("paused");
      expect(event.data.pause_collection).toEqual({ behavior: "void" });
    });

    it("maps customer.subscription.deleted", async () => {
      const stripe = realStripe();
      const body = JSON.stringify({
        id: "evt_del",
        type: "customer.subscription.deleted",
        created: 1717003000,
        data: {
          object: {
            id: "sub_9",
            customer: "cus_9",
            status: "canceled",
            cancel_at_period_end: false,
            pause_collection: null,
            items: {
              data: [
                {
                  price: { id: "price_pro" },
                  current_period_start: 10,
                  current_period_end: 20,
                },
              ],
            },
          },
        },
      });
      const gw = new StripeGateway(clientWithRealWebhooks(stripe));

      const event = await gw.parseWebhookEvent(body, signed(stripe, body));

      expect(event.type).toBe("customer.subscription.deleted");
      if (event.type !== "customer.subscription.deleted") throw new Error("narrow");
      expect(event.data.status).toBe("canceled");
      expect(event.data.id).toBe("sub_9");
    });

    it("maps checkout.session.completed by expanding line_items + subscription and reading item-level periods from the retrieved session", async () => {
      const stripe = realStripe();
      // The retrieved (authoritative) session carries the expanded subscription;
      // we read client_reference_id/customer/subscription from it, not the
      // possibly-incomplete webhook payload.
      const sessionsRetrieve = vi.fn().mockResolvedValue({
        id: "cs_1",
        mode: "subscription",
        client_reference_id: "user-1",
        customer: "cus_1",
        subscription: {
          id: "sub_1",
          items: {
            data: [{ current_period_start: 111, current_period_end: 222 }],
          },
        },
        line_items: { data: [{ price: { id: "price_lite" } }] },
      });
      const body = JSON.stringify({
        id: "evt_cs",
        type: "checkout.session.completed",
        created: 1717002000,
        data: {
          object: { id: "cs_1", subscription: null }, // webhook copy may lag
        },
      });
      const gw = new StripeGateway(
        clientWithRealWebhooks(stripe, {
          checkout: { sessions: { retrieve: sessionsRetrieve } },
        })
      );

      const event = await gw.parseWebhookEvent(body, signed(stripe, body));

      expect(sessionsRetrieve).toHaveBeenCalledWith("cs_1", {
        expand: ["line_items", "subscription"],
      });
      expect(event).toEqual({
        type: "checkout.session.completed",
        created: 1717002000,
        id: "evt_cs",
        data: {
          id: "cs_1",
          mode: "subscription",
          client_reference_id: "user-1",
          customer: "cus_1",
          subscription: "sub_1",
          current_period_start: 111,
          current_period_end: 222,
          line_items: [{ price: { id: "price_lite" } }],
        },
      });
    });

    it("maps a one-off checkout.session.completed (mode=payment, no subscription)", async () => {
      const stripe = realStripe();
      const sessionsRetrieve = vi.fn().mockResolvedValue({
        id: "cs_2",
        mode: "payment",
        client_reference_id: "bk_1", // booking id, not a user id
        customer: null,
        subscription: null,
        line_items: { data: [] },
      });
      const body = JSON.stringify({
        id: "evt_cs2",
        type: "checkout.session.completed",
        created: 1717002500,
        data: { object: { id: "cs_2" } },
      });
      const gw = new StripeGateway(
        clientWithRealWebhooks(stripe, {
          checkout: { sessions: { retrieve: sessionsRetrieve } },
        })
      );

      const event = await gw.parseWebhookEvent(body, signed(stripe, body));

      expect(event).toEqual({
        type: "checkout.session.completed",
        created: 1717002500,
        id: "evt_cs2",
        data: {
          id: "cs_2",
          mode: "payment",
          client_reference_id: "bk_1",
          customer: "",
          subscription: null,
          current_period_start: 0,
          current_period_end: 0,
          line_items: [],
        },
      });
    });

    it("maps invoice.paid resolving the subscription via parent.subscription_details", async () => {
      const stripe = realStripe();
      const body = JSON.stringify({
        id: "evt_inv",
        type: "invoice.paid",
        created: 1717004000,
        data: {
          object: {
            id: "in_1",
            customer: "cus_1",
            status: "paid",
            period_start: 100,
            period_end: 200,
            parent: { subscription_details: { subscription: "sub_1" } },
          },
        },
      });
      const gw = new StripeGateway(clientWithRealWebhooks(stripe));

      const event = await gw.parseWebhookEvent(body, signed(stripe, body));

      expect(event).toEqual({
        type: "invoice.paid",
        created: 1717004000,
        id: "evt_inv",
        data: {
          id: "in_1",
          customer: "cus_1",
          subscription: "sub_1",
          period_start: 100,
          period_end: 200,
          status: "paid",
        },
      });
    });

    it("maps invoice.payment_failed (subscription as an expanded object)", async () => {
      const stripe = realStripe();
      const body = JSON.stringify({
        id: "evt_inv2",
        type: "invoice.payment_failed",
        created: 1717005000,
        data: {
          object: {
            id: "in_2",
            customer: "cus_2",
            status: "open",
            period_start: 1,
            period_end: 2,
            parent: { subscription_details: { subscription: { id: "sub_2" } } },
          },
        },
      });
      const gw = new StripeGateway(clientWithRealWebhooks(stripe));

      const event = await gw.parseWebhookEvent(body, signed(stripe, body));

      expect(event.type).toBe("invoice.payment_failed");
      if (event.type !== "invoice.payment_failed") throw new Error("narrow");
      expect(event.data.subscription).toBe("sub_2");
      expect(event.data.status).toBe("open");
    });
  });
});
