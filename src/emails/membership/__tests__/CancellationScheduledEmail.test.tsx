import { describe, it, expect } from "vitest";
import { render } from "@react-email/components";
import { CancellationScheduledEmail } from "../CancellationScheduledEmail";

describe("CancellationScheduledEmail", () => {
  it("shows end date and reactivate CTA", async () => {
    const html = await render(<CancellationScheduledEmail name="Ada" tierName="Pro" endsAt="25 Jun 2026" />);
    expect(html).toContain("Your Butlers Inc Pro cancels on 25 Jun 2026");
    expect(html).toContain("Reactivate");
    expect(html).toContain("/members/settings");
  });
  it("has no em dashes", async () => {
    const html = await render(<CancellationScheduledEmail name="Ada" tierName="Pro" endsAt="25 Jun 2026" />);
    expect(html).not.toContain("—");
  });
});
