import { describe, it, expect } from "vitest";
import { virtualButlerSchema } from "../virtual-butler/route";

describe("Virtual Butler request validation", () => {
  it("rejects missing category", () => {
    const result = virtualButlerSchema.safeParse({
      description: "Book a table",
      membershipId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid category", () => {
    const result = virtualButlerSchema.safeParse({
      category: "hacking",
      description: "Book a table",
      membershipId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty description", () => {
    const result = virtualButlerSchema.safeParse({
      category: "restaurant",
      description: "",
      membershipId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(false);
  });

  it("rejects description over 1000 chars", () => {
    const result = virtualButlerSchema.safeParse({
      category: "restaurant",
      description: "x".repeat(1001),
      membershipId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid request", () => {
    const result = virtualButlerSchema.safeParse({
      category: "restaurant",
      description: "Book a table for 4 at The Ivy",
      membershipId: "550e8400-e29b-41d4-a716-446655440000",
      preferredDate: "2026-04-15",
      preferredTime: "19:00",
    });
    expect(result.success).toBe(true);
  });

  it("accepts request without optional fields", () => {
    const result = virtualButlerSchema.safeParse({
      category: "appointment",
      description: "Schedule dentist visit",
      membershipId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });
});
