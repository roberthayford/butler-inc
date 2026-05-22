import { describe, it, expect } from "vitest";
import { mergeContent } from "../content";

describe("mergeContent", () => {
  it("returns Supabase content when available", () => {
    const supabaseContent = {
      hero: { headline: "Custom headline", subheading: "Custom sub" },
      trustIndicators: ["Custom trust"],
      commonRequests: ["Custom request"],
    };
    const fallback = {
      seo: { title: "Test", description: "Test", keywords: [] },
      hero: { headline: "Fallback", subheading: "Fallback sub", useCases: ["test"] },
      howItWorks: { title: "How it works", steps: [] },
      trustIndicators: [{ text: "Fallback trust" }],
      commonRequests: ["Fallback request"],
      accentColor: "hsl(0 0% 0%)",
    };

    const result = mergeContent(supabaseContent, fallback);
    expect(result.hero.headline).toBe("Custom headline");
    expect(result.hero.subheading).toBe("Custom sub");
    expect(result.hero.useCases).toEqual(["test"]); // preserved from fallback
    expect(result.trustIndicators).toEqual([{ text: "Custom trust" }]);
    expect(result.commonRequests).toEqual(["Custom request"]);
    expect(result.seo.title).toBe("Test"); // non-editable fields preserved
  });

  it("returns fallback when Supabase content is null", () => {
    const fallback = {
      seo: { title: "Test", description: "Test", keywords: [] },
      hero: { headline: "Fallback", subheading: "Fallback sub", useCases: ["test"] },
      howItWorks: { title: "How it works", steps: [] },
      trustIndicators: [{ text: "Fallback trust" }],
      commonRequests: ["Fallback request"],
      accentColor: "hsl(0 0% 0%)",
    };

    const result = mergeContent(null, fallback);
    expect(result.hero.headline).toBe("Fallback");
    expect(result.trustIndicators).toEqual([{ text: "Fallback trust" }]);
  });
});
