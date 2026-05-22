import { describe, it, expect } from "vitest";
import { generateReference } from "../virtual-butler/route";

describe("Virtual Butler API helpers", () => {
  it("generateReference produces VB-XXXXX format", () => {
    const ref = generateReference();
    expect(ref).toMatch(/^VB-[A-Z0-9]{5}$/);
  });

  it("generates unique references", () => {
    const refs = new Set(Array.from({ length: 100 }, () => generateReference()));
    expect(refs.size).toBe(100);
  });
});
