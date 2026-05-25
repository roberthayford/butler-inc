import { describe, it, expect } from "vitest";
import { render } from "@react-email/components";
import { CancellationFinalEmail } from "../CancellationFinalEmail";

describe("CancellationFinalEmail", () => {
  it("shows end date and View plans CTA", async () => {
    const html = await render(<CancellationFinalEmail name="Ada" tierName="Frequent" endedAt="25 Jun 2026" />);
    expect(html).toContain("Your Butlers Inc Frequent has ended");
    expect(html).toContain("View plans");
    expect(html).toContain("/membership");
    expect(html).toContain("25 Jun 2026");
  });
  it("has no em dashes", async () => {
    const html = await render(<CancellationFinalEmail name="Ada" tierName="Frequent" endedAt="25 Jun 2026" />);
    expect(html).not.toContain("—");
  });
});
