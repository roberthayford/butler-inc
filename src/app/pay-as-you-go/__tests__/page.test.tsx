import { describe, expect, it } from "vitest";
import { render, screen } from "@/test/test-utils";
import { mockMotion } from "@/test/motion-mock";

mockMotion();

import PayAsYouGoPage from "../page";

describe("Pay As You Go page", () => {
  it("renders the butler grid, how-to-book, value callout, tiers, and back-to-home", () => {
    const { container } = render(<PayAsYouGoPage />);
    const text = container.textContent ?? "";

    // butler boxes
    expect(text).toContain("Busy Butler");
    // how to book
    expect(
      screen.getByRole("heading", { name: /how butlers inc\. works/i })
    ).toBeInTheDocument();
    // membership is cheaper
    expect(
      screen.getByRole("heading", { name: /members pay less/i })
    ).toBeInTheDocument();
    // membership packages
    expect(
      screen.getByRole("heading", { name: /membership packages/i })
    ).toBeInTheDocument();
    expect(text).toContain("Lite");
    expect(text).toContain("Frequent");
    expect(text).toContain("Pro");
    // back to home
    expect(
      screen.getByRole("link", { name: /back to home/i })
    ).toHaveAttribute("href", "/");
  });
});
