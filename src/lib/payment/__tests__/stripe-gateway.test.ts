import { describe, expect, it } from "vitest";
import { StripeGateway } from "../stripe-gateway";

describe("StripeGateway (stub)", () => {
  const gw = new StripeGateway();

  it("createCheckoutSession throws not-yet-implemented", async () => {
    await expect(gw.createCheckoutSession({} as never)).rejects.toThrow(/not yet implemented/i);
  });

  it("verifyPayment throws not-yet-implemented", async () => {
    await expect(gw.verifyPayment("any")).rejects.toThrow(/not yet implemented/i);
  });

  it("createSubscriptionCheckoutSession throws not-yet-implemented", async () => {
    await expect(gw.createSubscriptionCheckoutSession({} as never)).rejects.toThrow(/not yet implemented/i);
  });

  it("createPortalSession throws not-yet-implemented", async () => {
    await expect(gw.createPortalSession({} as never)).rejects.toThrow(/not yet implemented/i);
  });

  it("pauseSubscription throws not-yet-implemented", async () => {
    await expect(gw.pauseSubscription("any")).rejects.toThrow(/not yet implemented/i);
  });

  it("resumeSubscription throws not-yet-implemented", async () => {
    await expect(gw.resumeSubscription("any")).rejects.toThrow(/not yet implemented/i);
  });

  it("parseWebhookEvent throws not-yet-implemented", async () => {
    await expect(gw.parseWebhookEvent("{}", null)).rejects.toThrow(/not yet implemented/i);
  });
});
