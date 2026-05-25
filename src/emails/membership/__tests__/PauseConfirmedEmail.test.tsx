import { describe, it, expect } from "vitest";
import { render } from "@react-email/components";
import { PauseConfirmedEmail } from "../PauseConfirmedEmail";

describe("PauseConfirmedEmail", () => {
  it("confirms pause and links to settings", async () => {
    const html = await render(<PauseConfirmedEmail name="Ada" tierName="Lite" />);
    expect(html).toContain("Your Butlers Inc Lite is paused");
    expect(html).toContain("Resume membership");
    expect(html).toContain("/members/settings");
  });
  it("has no em dashes", async () => {
    const html = await render(<PauseConfirmedEmail name="Ada" tierName="Lite" />);
    expect(html).not.toContain("—");
  });
});
