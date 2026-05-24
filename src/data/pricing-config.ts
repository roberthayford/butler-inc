import type { ButlerTypeKey } from "@/data/butler-tasks";
import type { ButlerPricing, UrgencyMultiplier } from "@/lib/pricing/types";

export const BUTLER_PRICING: Record<ButlerTypeKey, ButlerPricing> = {
  busy: {
    id: "busy",
    name: "Busy Butler",
    hourlyRate: 50,
    minimumHours: 2,
    leadTimeHours: 4,
    bookingType: "self_service",
    isActive: true,
  },
  baby: {
    id: "baby",
    name: "Baby Butler",
    hourlyRate: 55,
    minimumHours: 3,
    leadTimeHours: 4,
    bookingType: "self_service",
    isActive: true,
  },
  base: {
    id: "base",
    name: "Base Butler",
    hourlyRate: 50,
    minimumHours: 2,
    leadTimeHours: 4,
    bookingType: "self_service",
    isActive: true,
  },
  budget: {
    id: "budget",
    name: "Budget Butler",
    hourlyRate: 50,
    minimumHours: 1,
    leadTimeHours: 4,
    bookingType: "self_service",
    isActive: true,
  },
  bougie: {
    id: "bougie",
    name: "Bougie Butler",
    hourlyRate: 120,
    minimumHours: null,
    leadTimeHours: 4,
    bookingType: "consultation",
    isActive: true,
  },
  bespoke: {
    id: "bespoke",
    name: "Bespoke Butler",
    hourlyRate: 120,
    minimumHours: null,
    leadTimeHours: 4,
    bookingType: "consultation",
    isActive: true,
  },
};

export const URGENCY_MULTIPLIERS: UrgencyMultiplier[] = [
  {
    id: "same_day",
    label: "Same-day premium",
    minHoursNotice: null,
    maxHoursNotice: 12,
    multiplier: 1.5,
    displayColour: "CC6600",
    isActive: true,
  },
  {
    id: "next_day",
    label: "Next-day premium",
    minHoursNotice: 12,
    maxHoursNotice: 36,
    multiplier: 1.25,
    displayColour: "CC8800",
    isActive: true,
  },
  {
    id: "standard",
    label: null,
    minHoursNotice: 36,
    maxHoursNotice: 168,
    multiplier: 1.0,
    displayColour: null,
    isActive: true,
  },
  {
    id: "early_bird",
    label: "Early-bird discount",
    minHoursNotice: 168,
    maxHoursNotice: null,
    multiplier: 0.95,
    displayColour: "2E8B57",
    isActive: true,
  },
];

export function getPricingForButler(butlerType: ButlerTypeKey): ButlerPricing {
  return BUTLER_PRICING[butlerType];
}

export function isSelfService(butlerType: ButlerTypeKey): boolean {
  return BUTLER_PRICING[butlerType].bookingType === "self_service";
}

export function isConsultation(butlerType: ButlerTypeKey): boolean {
  return BUTLER_PRICING[butlerType].bookingType === "consultation";
}
