import { describe, it, expect } from "vitest";
import { render } from "@react-email/components";
import { RenewalReceiptEmail } from "../RenewalReceiptEmail";

const props = { name: "Ada", tierName: "Frequent", monthlyPrice: 1000, hoursTotal: 20, tasksTotal: 10, periodEnd: "25 Jul 2026" };

describe("RenewalReceiptEmail", () => {
  it("shows monthly price, hours, tasks, and period end", async () => {
    const html = await render(<RenewalReceiptEmail {...props} />);
    expect(html).toContain("Your Butlers Inc Frequent has renewed");
    expect(html).toContain("£1000");
    expect(html).toContain("20 personal butler hours");
    expect(html).toContain("10 Virtual Butler tasks");
    expect(html).toContain("25 Jul 2026");
  });
  it("has no em dashes", async () => {
    const html = await render(<RenewalReceiptEmail {...props} />);
    expect(html).not.toContain("—");
  });
});
