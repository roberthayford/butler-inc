import { describe, it, expect } from "vitest";
import { render } from "@react-email/components";
import { PaymentFailedEmail } from "../PaymentFailedEmail";

describe("PaymentFailedEmail", () => {
  it("calls out the failure and links to update payment", async () => {
    const html = await render(<PaymentFailedEmail name="Ada" tierName="Pro" />);
    expect(html).toContain("Action needed: payment failed");
    expect(html).toContain("Pro");
    expect(html).toContain("/members/settings");
    expect(html).toContain("Update payment method");
  });
  it("has no em dashes", async () => {
    const html = await render(<PaymentFailedEmail name="Ada" tierName="Pro" />);
    expect(html).not.toContain("—");
  });
});
