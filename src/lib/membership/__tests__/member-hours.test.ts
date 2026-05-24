import { describe, it, expect } from "vitest";
import { hasSufficientMemberHours } from "../member-hours";

describe("hasSufficientMemberHours", () => {
  const membership = {
    personal_hours_total: 15,
    personal_hours_used: 12,
  };

  it("true when exactly enough hours remain", () => {
    expect(hasSufficientMemberHours(membership, 3)).toBe(true);
  });

  it("true when more hours remain than requested", () => {
    expect(hasSufficientMemberHours(membership, 2)).toBe(true);
  });

  it("false when not enough hours remain", () => {
    expect(hasSufficientMemberHours(membership, 4)).toBe(false);
  });

  it("true for zero-duration booking (defensive — shouldn't happen but mustn't crash)", () => {
    expect(hasSufficientMemberHours(membership, 0)).toBe(true);
  });

  it("handles fractional hours (e.g. 0.5)", () => {
    const partial = { personal_hours_total: 15, personal_hours_used: 14.5 };
    expect(hasSufficientMemberHours(partial, 0.5)).toBe(true);
    expect(hasSufficientMemberHours(partial, 0.6)).toBe(false);
  });

  it("false when membership is null", () => {
    expect(hasSufficientMemberHours(null, 1)).toBe(false);
  });

  it("false when membership row is missing the hours fields (defensive)", () => {
    expect(hasSufficientMemberHours({} as never, 1)).toBe(false);
  });

  it("guards against negative remaining (data corruption)", () => {
    const corrupt = { personal_hours_total: 5, personal_hours_used: 10 };
    expect(hasSufficientMemberHours(corrupt, 1)).toBe(false);
  });
});
