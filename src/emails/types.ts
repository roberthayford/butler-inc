export interface BookingEmailProps {
  reference: string
  butlerType: string
  serviceOption: string | null
  dayOption: "sameDay" | "nextDay" | "advance"
  specificDate?: string
  timeSlot: "morning" | "noon" | "evening"
  name: string
  email: string
  phone: string
  notes?: string | null
  // Pre-formatted — computed in route.ts before passing to templates
  formattedDate: string   // "Wednesday, 25 March 2026"
  priceLabel: string      // "from £55/hr"
  timeSlotLabel: string   // "Morning (7:00 - 11:59)"
}
