import { describe, it, expect } from "vitest";
import { render } from "@react-email/components";
import { WelcomeEmail } from "../WelcomeEmail";

const props = { name: "Ada Lovelace", tierName: "Lite", hoursTotal: 10, tasksTotal: 5, renewsAt: "25 Jun 2026" };

describe("WelcomeEmail", () => {
  it("includes tier name, hours and tasks counts, and the dashboard CTA URL", async () => {
    const html = await render(<WelcomeEmail {...props} />);
    expect(html).toContain("Welcome to Butlers Inc Lite");
    expect(html).toContain("10 personal butler hours");
    expect(html).toContain("5 virtual tasks");
    expect(html).toContain("25 Jun 2026");
    expect(html).toContain("/members/dashboard");
  });
  it("uses the member's name in the greeting", async () => {
    const html = await render(<WelcomeEmail {...props} />);
    expect(html).toContain("Hello Ada");
  });
  it("has no em dashes", async () => {
    const html = await render(<WelcomeEmail {...props} />);
    expect(html).not.toContain("—");
  });
});
