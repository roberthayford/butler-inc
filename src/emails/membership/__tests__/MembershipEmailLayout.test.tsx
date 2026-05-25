import { describe, it, expect } from "vitest";
import { render } from "@react-email/components";
import { MembershipEmailLayout } from "../components/MembershipEmailLayout";

describe("MembershipEmailLayout", () => {
  it("renders preview text and body children", async () => {
    const html = await render(
      <MembershipEmailLayout preview="Hello world" heading="Heading">
        <p>Body paragraph</p>
      </MembershipEmailLayout>
    );
    expect(html).toContain("Hello world");
    expect(html).toContain("Heading");
    expect(html).toContain("Body paragraph");
  });
});
