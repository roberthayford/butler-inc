import { describe, it, expect } from "vitest";
import { render } from "@react-email/components";
import { PaymentFailedNotification } from "../admin/PaymentFailedNotification";

describe("PaymentFailedNotification (admin)", () => {
  it("shows recovery context", async () => {
    const html = await render(<PaymentFailedNotification name="Ada" email="ada@example.com" tierName="Pro" />);
    expect(html).toContain("Payment failed: Ada (Pro)");
    expect(html).toContain("ada@example.com");
    expect(html).toContain("Stripe will retry");
  });
});
