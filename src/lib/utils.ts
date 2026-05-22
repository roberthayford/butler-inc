import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, parseISO, addDays } from "date-fns"
import { DAY_OPTIONS, TIME_SLOTS } from "@/data/booking-config"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBookingDate(
  dayOption: "sameDay" | "nextDay" | "advance",
  specificDate?: string
): string {
  if (dayOption === "advance" && specificDate) {
    return format(parseISO(specificDate), "EEEE, d MMMM yyyy")
  }
  if (dayOption === "sameDay") return format(new Date(), "EEEE, d MMMM yyyy")
  if (dayOption === "nextDay") return format(addDays(new Date(), 1), "EEEE, d MMMM yyyy")
  return dayOption
}

export function getPriceLabel(dayOption: string): string {
  return DAY_OPTIONS.find((d) => d.key === dayOption)?.priceLabel ?? ""
}

export function getTimeSlotLabel(timeSlot: string): string {
  const slot = TIME_SLOTS.find((t) => t.key === timeSlot)
  return slot ? `${slot.label} (${slot.times})` : timeSlot
}
