import { describe, it, expect } from "vitest";
import { render, screen } from "@/test/test-utils";
import { PlaceholderPage } from "../PlaceholderPage";

describe("PlaceholderPage", () => {
  it("renders title as h1", () => {
    render(<PlaceholderPage title="Cookie Policy" subtitle="Tracking the small print." />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("Cookie Policy");
  });

  it("renders subtitle text", () => {
    render(<PlaceholderPage title="Careers" subtitle="We're hiring soon — quietly first." />);
    expect(
      screen.getByText("We're hiring soon — quietly first.")
    ).toBeInTheDocument();
  });

  it("renders body when provided", () => {
    render(
      <PlaceholderPage
        title="Contact Us"
        subtitle="Our line will be open soon."
        body="Check back shortly."
      />
    );
    expect(screen.getByText("Check back shortly.")).toBeInTheDocument();
  });

  it("omits body when not provided", () => {
    render(<PlaceholderPage title="FAQs" subtitle="Questions, queued." />);
    expect(screen.queryByText("Check back shortly.")).not.toBeInTheDocument();
  });
});
