import { describe, it, expect } from "vitest";
import { render } from "@react-email/components";
import { PauseNotification } from "../admin/PauseNotification";

describe("PauseNotification (admin)", () => {
  it("shows pause context with timestamp", async () => {
    const html = await render(<PauseNotification name="Ada" email="ada@example.com" tierName="Lite" pausedAt="25 May 2026" />);
    expect(html).toContain("Membership paused: Ada (Lite)");
    expect(html).toContain("ada@example.com");
    expect(html).toContain("25 May 2026");
  });
});
