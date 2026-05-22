import { describe, it, expect } from "vitest";
import { isAdmin } from "../admin";

describe("isAdmin", () => {
  it("returns true for admin emails", () => {
    expect(isAdmin("rob@roberthayford.com")).toBe(true);
    expect(isAdmin("hello@butlersinc.com")).toBe(true);
    expect(isAdmin("roberthayford@gmail.com")).toBe(true);
  });

  it("returns false for non-admin emails", () => {
    expect(isAdmin("user@example.com")).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isAdmin(undefined)).toBe(false);
  });
});
