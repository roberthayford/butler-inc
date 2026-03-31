import { describe, it, expect } from "vitest";
import { render, screen } from "@/test/test-utils";
import { UsageGauge } from "../UsageGauge";

describe("UsageGauge", () => {
  it("renders label, used/total, and unit", () => {
    render(<UsageGauge label="Hours" used={7} total={15} unit="hrs" />);
    expect(screen.getByText("Hours")).toBeInTheDocument();
    expect(screen.getByText("8 hrs remaining")).toBeInTheDocument();
  });

  it("renders progress bar at correct width", () => {
    const { container } = render(<UsageGauge label="Tasks" used={3} total={10} unit="tasks" />);
    const progressBar = container.querySelector("[data-testid='gauge-fill']");
    expect(progressBar).toHaveStyle({ width: "30%" });
  });

  it("shows warning style when nearly depleted", () => {
    const { container } = render(<UsageGauge label="Hours" used={14} total={15} unit="hrs" />);
    const progressBar = container.querySelector("[data-testid='gauge-fill']");
    expect(progressBar?.className).toContain("bg-amber");
  });

  it("shows depleted style when all used", () => {
    const { container } = render(<UsageGauge label="Tasks" used={5} total={5} unit="tasks" />);
    const progressBar = container.querySelector("[data-testid='gauge-fill']");
    expect(progressBar?.className).toContain("bg-red");
  });

  it("handles zero total gracefully", () => {
    render(<UsageGauge label="Hours" used={0} total={0} unit="hrs" />);
    expect(screen.getByText("0 hrs remaining")).toBeInTheDocument();
  });
});
