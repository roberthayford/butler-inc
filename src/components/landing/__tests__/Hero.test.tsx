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
    p: ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
      <p {...props}>{children}</p>
    ),
  },
}));

vi.mock("@/components/ui/hero-background", () => ({
  LandingHeroBackground: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

describe("Hero", () => {
  it("renders the headline", () => {
    render(<Hero />);
    expect(
      screen.getByText("Your personal butler, on demand.")
    ).toBeInTheDocument();
  });

  it("renders a pricing subtitle", () => {
    render(<Hero />);
    expect(screen.getByText(/From £35\/hr/)).toBeInTheDocument();
  });

  it("renders a 'Browse Our Butlers' CTA link to /butlers", () => {
    render(<Hero />);
    const link = screen.getByRole("link", { name: /Browse Our Butlers/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/butlers");
  });

  it("renders a 'Sign In' CTA link to /members/login", () => {
    render(<Hero />);
    const link = screen.getByRole("link", { name: /Sign In/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/members/login");
  });

  it("does NOT render the old Members/Non-Members tab buttons", () => {
    render(<Hero />);
    expect(screen.queryByRole("button", { name: "Members" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Non-Members" })).not.toBeInTheDocument();
  });
});
