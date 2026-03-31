export interface BookingEmailProps {
  reference: string
  butlerType: string
  serviceOption: string | null
  dayOption: "sameDay" | "nextDay" | "advance"
  specificDate?: string
  timeSlot: "morning" | "noon" | "evening" | string
  name: string
  email: string
  phone: string
  notes?: string | null
  formattedDate: string
  priceLabel: string
  timeSlotLabel: string
  hourlyRate?: number
  durationHours?: number
  urgencyMultiplier?: number
  urgencyLabel?: string | null
  subtotal?: number
  totalPrice?: number
  isPaid?: boolean
}
