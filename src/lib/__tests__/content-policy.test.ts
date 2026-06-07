import { describe, expect, it } from "vitest";
import { findCopyViolations } from "../content-policy";
import type { ButlerContent } from "@/data/content-schema";

const clean: ButlerContent = {
  hero: {
    headline: "When time is of the essence.",
    subheading: "Fast, reliable deliveries across London.",
  },
  trustIndicators: ["DBS checked", "Insured for items up to £50,000"],
  commonRequests: ["Keys collected from estate agent on moving day"],
};

describe("findCopyViolations", () => {
  it("returns no violations for clean content", () => {
    expect(findCopyViolations(clean)).toEqual([]);
  });

  it("flags an em dash in a common request", () => {
    const violations = findCopyViolations({
      ...clean,
      commonRequests: ["Contract signing across London—collected same day"],
    });
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatch(/em dash/i);
  });

  it("flags an em dash in the hero subheading", () => {
    const violations = findCopyViolations({
      ...clean,
      hero: { headline: "Hi", subheading: "Rare finds—tailored to you" },
    });
    expect(violations).toHaveLength(1);
  });

  it("flags an em dash in a trust indicator", () => {
    const violations = findCopyViolations({
      ...clean,
      trustIndicators: ["DBS checked—and insured"],
    });
    expect(violations).toHaveLength(1);
  });
});
