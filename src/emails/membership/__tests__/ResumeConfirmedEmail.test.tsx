import { describe, it, expect } from "vitest";
import { render } from "@react-email/components";
import { ResumeConfirmedEmail } from "../ResumeConfirmedEmail";

describe("ResumeConfirmedEmail", () => {
  it("confirms resume and links to dashboard", async () => {
    const html = await render(<ResumeConfirmedEmail name="Ada" tierName="Lite" />);
    expect(html).toContain("Welcome back to your Butlers Inc Lite");
    expect(html).toContain("Book a butler");
    expect(html).toContain("/members/dashboard");
  });
  it("has no em dashes", async () => {
    const html = await render(<ResumeConfirmedEmail name="Ada" tierName="Lite" />);
    expect(html).not.toContain("—");
  });
});
