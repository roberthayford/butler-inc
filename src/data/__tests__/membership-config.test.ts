import { describe, it, expect } from "vitest";
import {
  MEMBERSHIP_TIERS,
  VIRTUAL_TASK_CATEGORIES,
  MEMBER_HOURLY_RATE,
  getTierBySlug,
} from "../membership-config";

describe("membership-config", () => {
  it("defines three tiers in order", () => {
    expect(MEMBERSHIP_TIERS).toHaveLength(3);
    expect(MEMBERSHIP_TIERS[0].slug).toBe("lite");
    expect(MEMBERSHIP_TIERS[1].slug).toBe("frequent");
    expect(MEMBERSHIP_TIERS[2].slug).toBe("pro");
  });

  it("each tier has hours and tasks", () => {
    for (const tier of MEMBERSHIP_TIERS) {
      expect(tier.personalHoursIncluded).toBeGreaterThan(0);
      expect(tier.virtualTasksIncluded).toBeGreaterThan(0);
      expect(tier.monthlyPrice).toBeGreaterThan(0);
    }
  });

  it("MEMBER_HOURLY_RATE is the flat member rate (£50)", () => {
    expect(MEMBER_HOURLY_RATE).toBe(50);
  });

  it("defines virtual task categories with labels", () => {
    expect(VIRTUAL_TASK_CATEGORIES).toHaveLength(4);
    const keys = VIRTUAL_TASK_CATEGORIES.map((c) => c.key);
    expect(keys).toContain("appointment");
    expect(keys).toContain("taxi_airport");
    expect(keys).toContain("restaurant");
    expect(keys).toContain("other");
  });

  it("getTierBySlug returns the correct tier", () => {
    const frequent = getTierBySlug("frequent");
    expect(frequent?.name).toBe("Frequent");
  });

  it("getTierBySlug returns undefined for invalid slug", () => {
    expect(getTierBySlug("platinum" as any)).toBeUndefined();
  });
});
