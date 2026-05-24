import type { MembershipTier, VirtualTaskCategory, TierSlug } from "@/types/membership";

/**
 * Flat member hourly rate at checkout.
 * Members pay this rate for any self-service butler regardless of urgency.
 * Non-members continue to pay the per-butler rate × urgency multiplier.
 */
export const MEMBER_HOURLY_RATE = 50;

export const MEMBERSHIP_TIERS: MembershipTier[] = [
  {
    id: "tier-lite",
    slug: "lite",
    name: "Lite",
    description: "Perfect for occasional butler needs",
    personalHoursIncluded: 10,
    virtualTasksIncluded: 5,
    monthlyPrice: 500,
    displayOrder: 1,
    isActive: true,
  },
  {
    id: "tier-frequent",
    slug: "frequent",
    name: "Frequent",
    description: "For those who count on a butler week to week",
    personalHoursIncluded: 20,
    virtualTasksIncluded: 10,
    monthlyPrice: 1000,
    displayOrder: 2,
    isActive: true,
  },
  {
    id: "tier-pro",
    slug: "pro",
    name: "Pro",
    description: "Maximum coverage for the most demanding schedules",
    personalHoursIncluded: 55,
    virtualTasksIncluded: 25,
    monthlyPrice: 2500,
    displayOrder: 3,
    isActive: true,
  },
];

export const VIRTUAL_TASK_CATEGORIES: { key: VirtualTaskCategory; label: string; description: string }[] = [
  { key: "appointment", label: "Appointment Booking", description: "Doctor, dentist, salon, spa, and other appointments" },
  { key: "taxi_airport", label: "Taxi & Airport", description: "Taxi bookings, airport transfers, and travel logistics" },
  { key: "restaurant", label: "Restaurant Reservation", description: "Table bookings and dining arrangements" },
  { key: "other", label: "Other Request", description: "Any other concierge task" },
];

export function getTierBySlug(slug: TierSlug): MembershipTier | undefined {
  return MEMBERSHIP_TIERS.find((t) => t.slug === slug);
}
