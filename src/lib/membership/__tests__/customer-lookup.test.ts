import { describe, expect, it } from "vitest";
import { getExistingStripeCustomerId } from "../customer-lookup";

function supabaseReturning(row: { stripe_customer_id?: string | null } | null) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => ({
              maybeSingle: async () => ({ data: row, error: null }),
            }),
          }),
        }),
      }),
    }),
  } as never;
}

describe("getExistingStripeCustomerId", () => {
  it("returns the stripe_customer_id when a prior membership row has one", async () => {
    const sb = supabaseReturning({ stripe_customer_id: "cus_123" });
    expect(await getExistingStripeCustomerId(sb, "user-1")).toBe("cus_123");
  });

  it("returns undefined when there is no membership row", async () => {
    const sb = supabaseReturning(null);
    expect(await getExistingStripeCustomerId(sb, "user-1")).toBeUndefined();
  });

  it("returns undefined when the row has no stripe_customer_id", async () => {
    const sb = supabaseReturning({ stripe_customer_id: null });
    expect(await getExistingStripeCustomerId(sb, "user-1")).toBeUndefined();
  });
});
