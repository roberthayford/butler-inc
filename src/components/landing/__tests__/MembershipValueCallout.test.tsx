import { describe, expect, it } from "vitest";
import { render, screen } from "@/test/test-utils";
import { MembershipValueCallout } from "../MembershipValueCallout";

describe("MembershipValueCallout", () => {
  it("explains why membership costs less", () => {
    render(<MembershipValueCallout />);
    expect(
      screen.getByRole("heading", { name: /members pay less/i })
    ).toBeInTheDocument();
  });

  it("states the flat rate, no surcharge, and monthly allowance", () => {
    const { container } = render(<MembershipValueCallout />);
    const text = container.textContent ?? "";
    expect(text).toMatch(/flat £50/i);
    expect(text).toMatch(/no urgency surcharge/i);
    expect(text).toMatch(/monthly allowance/i);
  });

  it("uses no em dashes (customer-facing copy rule)", () => {
    const { container } = render(<MembershipValueCallout />);
    expect(container.textContent ?? "").not.toContain("—");
  });
});
