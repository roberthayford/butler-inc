import { describe, it, expect } from "vitest";
import { render } from "@react-email/components";
import { PlanChangedEmail } from "../PlanChangedEmail";

const props = { name: "Ada", fromTierName: "Lite", toTierName: "Pro", newHoursTotal: 55, renewsAt: "25 Jun 2026" };

describe("PlanChangedEmail", () => {
  it("shows old and new tier, new hours, renew date", async () => {
    const html = await render(<PlanChangedEmail {...props} />);
    expect(html).toContain("Your plan changed: Lite to Pro");
    expect(html).toContain("Lite to Pro");
    expect(html).toContain("55");
    expect(html).toContain("25 Jun 2026");
  });
  it("has no em dashes", async () => {
    const html = await render(<PlanChangedEmail {...props} />);
    expect(html).not.toContain("—");
  });
});
