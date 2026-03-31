import type { UrgencyMultiplier, PriceCalculation } from "./types";

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
  serviceDate: string
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
}

export function calculatePricePreview(
  input: PricePreviewInput
): Omit<PriceCalculation, "butlerType" | "tierName" | "currency"> {
  const { hourlyRate, startTime, endTime, serviceDate, multipliers } = input;

  const durationHours = calculateDurationHours(startTime, endTime);

  const serviceDateTime = new Date(`${serviceDate}T${startTime}:00`);
  const hoursNotice =
    (serviceDateTime.getTime() - Date.now()) / (1000 * 60 * 60);

  const urgency = determineUrgencyMultiplier(hoursNotice, multipliers);

  const subtotal = hourlyRate * durationHours;
  const total = Math.round(subtotal * urgency.multiplier * 100) / 100;

  let breakdown = `£${hourlyRate}/hr × ${durationHours}hrs`;
  if (urgency.multiplier !== 1.0) {
    breakdown += ` × ${urgency.multiplier}`;
  }
  breakdown += ` = £${total.toFixed(2)}`;

  return {
    hourlyRate,
    durationHours,
    urgencyMultiplier: urgency.multiplier,
    urgencyLabel: urgency.label,
    urgencyColour: urgency.displayColour,
    subtotal,
    total,
    breakdown,
  };
}
