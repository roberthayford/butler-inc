import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@/test/test-utils";
import Home from "../page";

vi.mock("@/components/landing/Header", () => ({
  Header: () => <div data-testid="header">Header</div>,
}));
vi.mock("@/components/landing/Hero", () => ({
  Hero: () => <div data-testid="hero">Hero</div>,
}));
vi.mock("@/components/landing/HowItWorks", () => ({
  HowItWorks: () => <div data-testid="how-it-works">HowItWorks</div>,
}));
vi.mock("@/components/landing/GenieSection", () => ({
  GenieSection: () => <div data-testid="genie-section">GenieSection</div>,
}));
vi.mock("@/components/landing/ButlerCategoryGrid", () => ({
  ButlerCategoryGrid: () => <div data-testid="butler-grid">ButlerCategoryGrid</div>,
}));
vi.mock("@/components/landing/Footer", () => ({
  Footer: () => <div data-testid="footer">Footer</div>,
}));

describe("Home page", () => {
  it("renders main landmark", () => {
    render(<Home />);
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("renders header and footer", () => {
    render(<Home />);
    expect(screen.getByTestId("header")).toBeInTheDocument();
    expect(screen.getByTestId("footer")).toBeInTheDocument();
  });

  it("renders HowItWorks section", () => {
    render(<Home />);
    expect(screen.getByTestId("how-it-works")).toBeInTheDocument();
  });

  it("renders ButlerCategoryGrid section", () => {
    render(<Home />);
    expect(screen.getByTestId("butler-grid")).toBeInTheDocument();
  });

  it("renders Hero section", () => {
    render(<Home />);
    expect(screen.getByTestId("hero")).toBeInTheDocument();
  });

  it("renders GenieSection", () => {
    render(<Home />);
    expect(screen.getByTestId("genie-section")).toBeInTheDocument();
  });
});
