import type { MembershipTier, VirtualTaskCategory, TierSlug } from "@/types/membership";

/** Member hourly rate — matches Budget Butler rate as incentive */
export const MEMBER_HOURLY_RATE = 35;

export const MEMBERSHIP_TIERS: MembershipTier[] = [
  {
    id: "tier-lite",
    slug: "lite",
    name: "Lite",
    description: "Perfect for occasional butler needs",
    personalHoursIncluded: 5,
    virtualTasksIncluded: 3,
    monthlyPrice: 49,
    displayOrder: 1,
    isActive: true,
  },
  {
    id: "tier-essential",
    slug: "essential",
    name: "Essential",
    description: "For regular butler service users",
    personalHoursIncluded: 15,
    virtualTasksIncluded: 8,
    monthlyPrice: 99,
    displayOrder: 2,
    isActive: true,
  },
  {
    id: "tier-heavy",
    slug: "heavy",
    name: "Heavy",
    description: "Maximum butler coverage for busy lifestyles",
    personalHoursIncluded: 30,
    virtualTasksIncluded: 15,
    monthlyPrice: 199,
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
