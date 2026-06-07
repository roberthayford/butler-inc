import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@/test/test-utils";
import { mockMotion } from "@/test/motion-mock";

mockMotion();

// Mock GenieDrawer to isolate GenieStickyBar tests
vi.mock("../GenieDrawer", () => ({
  GenieDrawer: ({ open, onClose }: { open: boolean; onClose: () => void }) =>
    open ? (
      <div data-testid="genie-drawer">
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

import { GenieStickyBar } from "../GenieStickyBar";

beforeEach(() => {
  vi.restoreAllMocks();
  Object.defineProperty(window, "scrollY", { value: 0, writable: true });
});

describe("GenieStickyBar", () => {
  it("is hidden when scrollY is below threshold", () => {
    render(<GenieStickyBar />);
    const bar = screen.getByRole("complementary", { hidden: true });
    expect(bar).toHaveAttribute("aria-hidden", "true");
  });

  it("becomes visible after scrolling past 200px", () => {
    render(<GenieStickyBar />);
    Object.defineProperty(window, "scrollY", { value: 250 });
    fireEvent.scroll(window);
    const bar = screen.getByRole("complementary");
    expect(bar).toHaveAttribute("aria-hidden", "false");
  });

  it("keeps the closed tab focused on the CTA label", () => {
    render(<GenieStickyBar />);
    expect(
      screen.queryByText(/butlers aren't quick enough/i)
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/make it happen/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /summon your genie/i, hidden: true })
    ).toBeInTheDocument();
  });

  it("shows the CTA in red on mobile (not charcoal)", () => {
    Object.defineProperty(window, "scrollY", { value: 250 });
    render(<GenieStickyBar />);
    fireEvent.scroll(window);
    const button = screen.getByRole("button", {
      name: /summon your genie/i,
    });
    // Red must apply on all breakpoints, not only at md+.
    expect(button.className).toContain("bg-destructive");
    expect(button.className).not.toMatch(/(^|\s)bg-charcoal/);
  });

  it("opens the drawer when CTA button is clicked", () => {
    Object.defineProperty(window, "scrollY", { value: 250 });
    render(<GenieStickyBar />);
    fireEvent.scroll(window);
    fireEvent.click(
      screen.getByRole("button", { name: /summon your genie/i })
    );
    expect(screen.getByTestId("genie-drawer")).toBeInTheDocument();
  });

  it("closes the drawer when onClose is called", () => {
    Object.defineProperty(window, "scrollY", { value: 250 });
    render(<GenieStickyBar />);
    fireEvent.scroll(window);
    fireEvent.click(
      screen.getByRole("button", { name: /summon your genie/i })
    );
    expect(screen.getByTestId("genie-drawer")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Close"));
    expect(screen.queryByTestId("genie-drawer")).not.toBeInTheDocument();
  });
});
