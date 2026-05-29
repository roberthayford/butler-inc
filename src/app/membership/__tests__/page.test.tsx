import { describe, expect, it } from "vitest";
import { render, screen } from "@/test/test-utils";
import MembershipPage from "../page";

describe("/membership", () => {
  it("renders heading + intro + all 3 tier names + footer reassurance", () => {
    render(<MembershipPage />);
    expect(screen.getByRole("heading", { name: /become a member/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/flat £50\/hr rate/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Virtual Butler tasks/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/No surcharges/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/No urgency surcharges/i)).not.toBeInTheDocument();
    expect(screen.getByText("Lite")).toBeInTheDocument();
    expect(screen.getByText("Frequent")).toBeInTheDocument();
    expect(screen.getByText("Pro")).toBeInTheDocument();
    expect(screen.getByText(/cancel, upgrade, or pause anytime/i)).toBeInTheDocument();
  });
});
