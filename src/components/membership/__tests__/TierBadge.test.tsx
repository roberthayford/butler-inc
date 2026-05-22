import { describe, it, expect } from "vitest";
import { render, screen } from "@/test/test-utils";
import { TierBadge } from "../TierBadge";

describe("TierBadge", () => {
  it("renders tier name", () => {
    render(<TierBadge tier="lite" />);
    expect(screen.getByText("Lite")).toBeInTheDocument();
  });

  it("renders essential tier", () => {
    render(<TierBadge tier="essential" />);
    expect(screen.getByText("Essential")).toBeInTheDocument();
  });

  it("renders heavy tier", () => {
    render(<TierBadge tier="heavy" />);
    expect(screen.getByText("Heavy")).toBeInTheDocument();
  });

  it("applies size variant", () => {
    const { container } = render(<TierBadge tier="heavy" size="lg" />);
    expect(container.firstChild).toHaveClass("text-sm");
  });
});
