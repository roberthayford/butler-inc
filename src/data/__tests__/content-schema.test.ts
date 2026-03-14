import { describe, it, expect } from "vitest";
import { butlerContentSchema } from "../content-schema";

describe("butlerContentSchema", () => {
  it("validates valid butler content", () => {
    const valid = {
      hero: {
        headline: "When time is of the essence.",
        subheading: "For time-critical documents.",
      },
      trustIndicators: ["DBS checked", "Insured"],
      commonRequests: ["Contract delivery", "Prescription pickup"],
    };
    expect(butlerContentSchema.parse(valid)).toEqual(valid);
  });

  it("rejects empty headline", () => {
    const invalid = {
      hero: { headline: "", subheading: "Some text" },
      trustIndicators: [],
      commonRequests: [],
    };
    expect(() => butlerContentSchema.parse(invalid)).toThrow();
  });

  it("rejects missing fields", () => {
    expect(() => butlerContentSchema.parse({})).toThrow();
  });
});
