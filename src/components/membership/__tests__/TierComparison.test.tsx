import { describe, expect, it } from "vitest";
import { render, screen } from "@/test/test-utils";
import { TierComparison } from "../TierComparison";

describe("TierComparison", () => {
  it("renders all three active tiers", () => {
    render(<TierComparison />);
    expect(screen.getByText("Lite")).toBeInTheDocument();
    expect(screen.getByText("Essential")).toBeInTheDocument();
    expect(screen.getByText("Heavy")).toBeInTheDocument();
  });
});
