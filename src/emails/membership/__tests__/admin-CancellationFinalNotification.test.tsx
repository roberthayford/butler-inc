import { describe, it, expect } from "vitest";
import { render } from "@react-email/components";
import { CancellationFinalNotification } from "../admin/CancellationFinalNotification";

describe("CancellationFinalNotification (admin)", () => {
  it("shows ended context", async () => {
    const html = await render(<CancellationFinalNotification name="Ada" email="ada@example.com" tierName="Lite" endedAt="25 Jun 2026" />);
    expect(html).toContain("Membership ended: Ada (Lite)");
    expect(html).toContain("ada@example.com");
    expect(html).toContain("25 Jun 2026");
  });
});
