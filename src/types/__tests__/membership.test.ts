import { describe, it, expect } from "vitest";
import type {
  MembershipTier,
  Membership,
  VirtualButlerRequest,
  VirtualTaskCategory,
} from "../membership";

describe("Membership types", () => {
  it("MembershipTier has required fields", () => {
    const tier: MembershipTier = {
      id: "tier-1",
      slug: "lite",
      name: "Lite",
      description: "Entry level membership",
      personalHoursIncluded: 5,
      virtualTasksIncluded: 3,
      monthlyPrice: 49,
      displayOrder: 1,
      isActive: true,
    };
    expect(tier.slug).toBe("lite");
    expect(tier.personalHoursIncluded).toBe(5);
  });

  it("Membership tracks usage with remaining calculations", () => {
    const membership: Membership = {
      id: "mem-1",
      userId: "user-1",
      tierId: "tier-1",
      tier: {
        id: "tier-1",
        slug: "essential",
        name: "Essential",
        description: "Mid-tier",
        personalHoursIncluded: 15,
        virtualTasksIncluded: 8,
        monthlyPrice: 99,
        displayOrder: 2,
        isActive: true,
      },
      personalHoursTotal: 15,
      personalHoursUsed: 7,
      virtualTasksTotal: 8,
      virtualTasksUsed: 3,
      billingPeriodStart: "2026-04-01",
      billingPeriodEnd: "2026-04-30",
      status: "active",
      createdAt: "2026-03-31T00:00:00Z",
      updatedAt: "2026-03-31T00:00:00Z",
    };
    expect(membership.personalHoursTotal - membership.personalHoursUsed).toBe(8);
    expect(membership.virtualTasksTotal - membership.virtualTasksUsed).toBe(5);
    expect(membership.status).toBe("active");
  });

  it("VirtualButlerRequest has required fields", () => {
    const request: VirtualButlerRequest = {
      id: "vr-1",
      userId: "user-1",
      membershipId: "mem-1",
      reference: "VB-ABC12",
      category: "appointment",
      description: "Book dentist appointment for Tuesday",
      preferredDate: "2026-04-05",
      preferredTime: "14:00",
      status: "pending",
      adminNotes: null,
      createdAt: "2026-03-31T10:00:00Z",
      updatedAt: "2026-03-31T10:00:00Z",
    };
    expect(request.category).toBe("appointment");
    expect(request.status).toBe("pending");
  });

  it("VirtualTaskCategory covers all categories", () => {
    const categories: VirtualTaskCategory[] = [
      "appointment",
      "taxi_airport",
      "restaurant",
      "other",
    ];
    expect(categories).toHaveLength(4);
  });
});
