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
});
