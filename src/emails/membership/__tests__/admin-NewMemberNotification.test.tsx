import { describe, it, expect } from "vitest";
import { render } from "@react-email/components";
import { NewMemberNotification } from "../admin/NewMemberNotification";

const props = { name: "Ada Lovelace", email: "ada@example.com", tierName: "Lite", monthlyPrice: 500, subscriptionId: "sub_abc123" };

describe("NewMemberNotification (admin)", () => {
  it("shows name, email, tier, price, subscription ID", async () => {
    const html = await render(<NewMemberNotification {...props} />);
    expect(html).toContain("New Lite member: Ada Lovelace");
    expect(html).toContain("ada@example.com");
    expect(html).toContain("£500");
    expect(html).toContain("sub_abc123");
  });
});
