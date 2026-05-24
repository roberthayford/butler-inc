import { describe, expect, it } from "vitest";
import { render, screen } from "@/test/test-utils";
import MembershipPage from "../page";

describe("/membership", () => {
  it("renders heading + intro + all 3 tier names + footer reassurance", () => {
    render(<MembershipPage />);
    expect(screen.getByRole("heading", { name: /become a member/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/flat £50\/hr rate/i)).toBeInTheDocument();
    expect(screen.getByText("Lite")).toBeInTheDocument();
    expect(screen.getByText("Essential")).toBeInTheDocument();
    expect(screen.getByText("Heavy")).toBeInTheDocument();
    expect(screen.getByText(/cancel, upgrade, or pause anytime/i)).toBeInTheDocument();
  });
});
