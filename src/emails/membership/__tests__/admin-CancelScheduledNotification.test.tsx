import { describe, it, expect } from "vitest";
import { render } from "@react-email/components";
import { CancelScheduledNotification } from "../admin/CancelScheduledNotification";

describe("CancelScheduledNotification (admin)", () => {
  it("shows cancellation context", async () => {
    const html = await render(<CancelScheduledNotification name="Ada" email="ada@example.com" tierName="Pro" endsAt="25 Jun 2026" />);
    expect(html).toContain("Cancellation scheduled: Ada (Pro)");
    expect(html).toContain("ada@example.com");
    expect(html).toContain("25 Jun 2026");
  });
});
