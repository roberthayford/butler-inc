import { describe, it, expect } from "vitest";
import { render, screen } from "@/test/test-utils";
import { Footer } from "../Footer";

const expectedLinks: Array<{ href: string; text: string }> = [
  { href: "/about", text: "About Us" },
  { href: "/terms", text: "Terms and Conditions" },
  { href: "/privacy", text: "Privacy Policy" },
  { href: "/refund", text: "Refund Policy" },
  { href: "/cookies", text: "Cookie Policy" },
  { href: "/ico", text: "ICO Membership" },
  { href: "/careers", text: "Careers" },
  { href: "/contact", text: "Contact Us" },
  { href: "/faqs", text: "FAQs" },
];

describe("Footer", () => {
  it("renders all 9 site links with the expected text and href", () => {
    render(<Footer />);
    for (const { href, text } of expectedLinks) {
      const link = screen.getByRole("link", { name: text });
      expect(link).toHaveAttribute("href", href);
    }
  });

  it("renders the brand block with mailto", () => {
    render(<Footer />);
    expect(screen.getByText("Butlers Inc.")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Premium Butler, Concierge Service and Personal Assistant service across the UK and Beyond"
      )
    ).toBeInTheDocument();
    const email = screen.getByRole("link", { name: "hello@butlersinc.com" });
    expect(email).toHaveAttribute("href", "mailto:hello@butlersinc.com");
  });

  it("renders Our Butlers heading", () => {
    render(<Footer />);
    expect(screen.getByText("Our Butlers")).toBeInTheDocument();
  });

  it("uses a 4-column grid at md breakpoint", () => {
    const { container } = render(<Footer />);
    const grid = container.querySelector(".grid");
    expect(grid?.className).toMatch(/md:grid-cols-4/);
  });

  it("does not render the old 'Legal' section heading", () => {
    render(<Footer />);
    expect(screen.queryByText("Legal")).not.toBeInTheDocument();
  });
});
