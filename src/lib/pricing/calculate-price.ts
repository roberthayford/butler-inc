import type { UrgencyMultiplier, PriceCalculation } from "./types";
import { MEMBER_HOURLY_RATE } from "@/data/membership-config";

export function timeToMinutes(time: string): number {
  const [hours, mins] = time.split(":").map(Number);
  return hours * 60 + mins;
}

export function calculateDurationHours(
  startTime: string,
  endTime: string
): number {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  return (end - start) / 60;
}

export function validateBookingTime(
  startTime: string,
  endTime: string,
  minimumHours: number | null,
  serviceDate: string,
  leadTimeHours: number = 0,
  serviceStartsAtUtc?: string,
  now: Date = new Date()
): { valid: boolean; error?: string } {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  if (endMinutes <= startMinutes) {
    return { valid: false, error: "End time must be after start time" };
  }

  if (startMinutes < timeToMinutes("06:00")) {
    return {
      valid: false,
      error: "Bookings are available between 06:00 and 23:00",
    };
  }

  if (endMinutes > timeToMinutes("23:00")) {
    return {
      valid: false,
      error: "Bookings are available between 06:00 and 23:00",
    };
  }

  if (minimumHours !== null) {
    const durationHours = (endMinutes - startMinutes) / 60;
    if (durationHours < minimumHours) {
      return {
        valid: false,
        error: `Minimum booking is ${minimumHours} hours`,
      };
    }
  }

  if (leadTimeHours > 0) {
    const serviceStart = serviceStartsAtUtc
      ? new Date(serviceStartsAtUtc)
      : new Date(`${serviceDate}T${startTime}:00Z`);

    if (Number.isNaN(serviceStart.getTime())) {
      return {
        valid: false,
        error: "Invalid booking start time",
      };
    }

    const earliestStart = now.getTime() + leadTimeHours * 60 * 60 * 1000;
    if (serviceStart.getTime() < earliestStart) {
      return {
        valid: false,
        error: `Bookings require at least ${leadTimeHours} hours' notice`,
      };
    }
  }

  return { valid: true };
}

export function determineUrgencyMultiplier(
  hoursNotice: number,
  multipliers: UrgencyMultiplier[]
): {
  id: string;
  multiplier: number;
  label: string | null;
  displayColour: string | null;
} {
  const activeMultipliers = multipliers.filter((m) => m.isActive);

  for (const m of activeMultipliers) {
    const aboveMin =
      m.minHoursNotice === null || hoursNotice >= m.minHoursNotice;
    const belowMax =
      m.maxHoursNotice === null || hoursNotice < m.maxHoursNotice;

    if (aboveMin && belowMax) {
      return {
        id: m.id,
        multiplier: m.multiplier,
        label: m.label,
        displayColour: m.displayColour,
      };
    }
  }

  return { id: "standard", multiplier: 1.0, label: null, displayColour: null };
}

export interface PricePreviewInput {
  hourlyRate: number;
  startTime: string;
  endTime: string;
  serviceDate: string;
  multipliers: UrgencyMultiplier[];
  /**
   * When true: hourly rate is overridden to MEMBER_HOURLY_RATE, urgency
   * multiplier is forced to 1.0, and the label becomes "Member rate".
   * Active membership status must be verified server-side before trusting
   * a client-supplied true.
   */
  isMember?: boolean;
}

export function calculatePricePreview(
  input: PricePreviewInput
): Omit<PriceCalculation, "butlerType" | "tierName" | "currency"> {
  const { startTime, endTime, serviceDate, multipliers, isMember } = input;

  const durationHours = calculateDurationHours(startTime, endTime);

  const effectiveRate = isMember ? MEMBER_HOURLY_RATE : input.hourlyRate;

  const serviceDateTime = new Date(`${serviceDate}T${startTime}:00`);
  const hoursNotice =
    (serviceDateTime.getTime() - Date.now()) / (1000 * 60 * 60);

  const urgency = isMember
    ? { id: "member", multiplier: 1.0, label: "Member rate", displayColour: null }
    : determineUrgencyMultiplier(hoursNotice, multipliers);

  const subtotal = effectiveRate * durationHours;
  const total = Math.round(subtotal * urgency.multiplier * 100) / 100;

  let breakdown = `£${effectiveRate}/hr × ${durationHours}hrs`;
  if (urgency.multiplier !== 1.0) {
    breakdown += ` × ${urgency.multiplier}`;
  }
  breakdown += ` = £${total.toFixed(2)}`;

  return {
    hourlyRate: effectiveRate,
    durationHours,
    urgencyMultiplier: urgency.multiplier,
    urgencyLabel: urgency.label,
    urgencyColour: urgency.displayColour,
    subtotal,
    total,
    breakdown,
  };
}
