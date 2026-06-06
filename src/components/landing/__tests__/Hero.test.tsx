import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@/test/test-utils";
import { Hero } from "../Hero";

vi.mock("motion/react", () => ({
  motion: {
    h1: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
      <h1 {...props}>{children}</h1>
    ),
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

vi.mock("@/components/ui/hero-background", () => ({
  LandingHeroBackground: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

// AudienceCTA is rendered inside Hero — mock it to keep Hero tests focused
vi.mock("@/components/landing/AudienceCTA", () => ({
  AudienceCTA: () => <div data-testid="audience-cta-stub" />,
}));

describe("Hero", () => {
  it("renders the headline", () => {
    render(<Hero />);
    // The headline is split across elements ("Your personal butler," + a
    // <span>on demand</span>), so assert on the heading's combined text content.
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Your personal butler, on demand"
    );
  });

  it("renders the AudienceCTA inside the hero", () => {
    render(<Hero />);
    expect(screen.getByTestId("audience-cta-stub")).toBeInTheDocument();
  });

  it("does NOT render the old Members/Non-Members tab buttons", () => {
    render(<Hero />);
    expect(screen.queryByRole("button", { name: "Members" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Non-Members" })).not.toBeInTheDocument();
  });
});
