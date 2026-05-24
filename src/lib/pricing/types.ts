import type { ButlerTypeKey } from "@/data/butler-tasks";

export type BookingType = "self_service" | "consultation";

export interface ButlerPricing {
  id: ButlerTypeKey;
  name: string;
  hourlyRate: number;
  minimumHours: number | null;
  leadTimeHours: number;
  bookingType: BookingType;
  isActive: boolean;
}

export interface UrgencyMultiplier {
  id: string;
  label: string | null;
  minHoursNotice: number | null;
  maxHoursNotice: number | null;
  multiplier: number;
  displayColour: string | null;
  isActive: boolean;
}

export interface PriceCalculation {
  butlerType: ButlerTypeKey;
  tierName: string;
  hourlyRate: number;
  durationHours: number;
  urgencyMultiplier: number;
  urgencyLabel: string | null;
  urgencyColour: string | null;
  subtotal: number;
  total: number;
  currency: string;
  breakdown: string;
}

export interface BookingPayload {
  butlerType: ButlerTypeKey;
  serviceOption: string | null;
  customDescription?: string;
  serviceDate: string;
  startTime: string;
  endTime: string;
  serviceStartsAtUtc: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  additionalNotes?: string;
}

// Re-exports for back-compat; canonical home is now @/lib/payment/types
export type {
  CheckoutSessionRequest,
  CheckoutSessionResult,
  PaymentGateway,
} from "@/lib/payment/types";

export type PaymentStatus = "pending" | "paid" | "refunded" | "failed";
export type BookingStatus =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface BookingRecord {
  id: string;
  bookingReference: string;
  butlerType: ButlerTypeKey;
  serviceOption: string | null;
  serviceDate: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  hourlyRate: number;
  urgencyMultiplier: number;
  urgencyLabel: string | null;
  subtotal: number;
  totalPrice: number;
  currency: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  additionalNotes: string | null;
  stripeCheckoutSessionId: string | null;
  stripePaymentIntentId: string | null;
  paymentStatus: PaymentStatus;
  status: BookingStatus;
  createdAt: string;
  confirmedAt: string | null;
}
