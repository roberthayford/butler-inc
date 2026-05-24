import { describe, it, expect } from "vitest";
import { render, screen } from "@/test/test-utils";
import { TierBadge } from "../TierBadge";

describe("TierBadge", () => {
  it("renders tier name", () => {
    render(<TierBadge tier="lite" />);
    expect(screen.getByText("Lite")).toBeInTheDocument();
  });

  it("renders frequent tier", () => {
    render(<TierBadge tier="frequent" />);
    expect(screen.getByText("Frequent")).toBeInTheDocument();
  });

  it("renders pro tier", () => {
    render(<TierBadge tier="pro" />);
    expect(screen.getByText("Pro")).toBeInTheDocument();
  });

  it("applies size variant", () => {
    const { container } = render(<TierBadge tier="pro" size="lg" />);
    expect(container.firstChild).toHaveClass("text-sm");
  });
});
