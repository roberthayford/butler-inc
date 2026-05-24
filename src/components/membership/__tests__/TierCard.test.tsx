import { describe, expect, it } from "vitest";
import { render, screen } from "@/test/test-utils";
import { TierCard } from "../TierCard";
import { MEMBERSHIP_TIERS } from "@/data/membership-config";

const lite = MEMBERSHIP_TIERS.find((t) => t.slug === "lite")!;

describe("TierCard", () => {
  it("renders tier name, price, hours, tasks", () => {
    render(<TierCard tier={lite} />);
    expect(screen.getByText("Lite")).toBeInTheDocument();
    expect(screen.getByText(/£49/)).toBeInTheDocument();
    expect(screen.getByText(/5 personal butler hours/i)).toBeInTheDocument();
    expect(screen.getByText(/3 virtual tasks/i)).toBeInTheDocument();
  });

  it("renders a CTA link to /membership/checkout/[slug]", () => {
    render(<TierCard tier={lite} />);
    const link = screen.getByRole("link", { name: /choose lite/i });
    expect(link).toHaveAttribute("href", "/membership/checkout/lite");
  });
});
