import { DevBookingStore } from "./dev-booking-store";

export interface BookingInsertData {
  booking_reference: string;
  butler_type: string;
  service_option: string | null;
  service_date: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  hourly_rate: number;
  urgency_multiplier: number;
  urgency_label: string | null;
  subtotal: number;
  total_price: number;
  currency: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  additional_notes: string | null;
  status: string;
  payment_status: string;
}

export interface BookingRow extends BookingInsertData {
  id: string;
  checkout_session_id: string | null;
  payment_intent_id: string | null;
  confirmed_at: string | null;
  created_at: string;
}

export interface BookingRepository {
  insertBooking(data: BookingInsertData): Promise<{ id: string }>;
  updateCheckoutSession(id: string, sessionId: string): Promise<void>;
  findByCheckoutSession(sessionId: string): Promise<BookingRow | null>;
  confirmPayment(id: string, paymentIntentId: string | null): Promise<void>;
}

let devStoreInstance: DevBookingStore | null = null;

export function getBookingRepository(): BookingRepository {
  if (process.env.DEV_BYPASS_DB === "true") {
    if (!devStoreInstance) {
      devStoreInstance = new DevBookingStore();
      console.warn("[booking-repository] Using in-memory dev store — data will not persist across restarts");
    }
    return devStoreInstance;
  }

  return new SupabaseBookingRepository();
}

class SupabaseBookingRepository implements BookingRepository {
  private get admin() {
    // Lazy import to avoid pulling in Supabase when in dev bypass mode
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createServiceClient } = require("@/lib/supabase/server");
    return createServiceClient();
  }

  async insertBooking(data: BookingInsertData): Promise<{ id: string }> {
    const { data: booking, error } = await this.admin
      .from("priced_bookings")
      .insert(data)
      .select("id")
      .single();

    if (error) {
      console.error("Booking insert failed:", error);
      throw new Error("Failed to create booking");
    }

    return { id: booking.id };
  }

  async updateCheckoutSession(id: string, sessionId: string): Promise<void> {
    await this.admin
      .from("priced_bookings")
      .update({ checkout_session_id: sessionId })
      .eq("id", id);
  }

  async findByCheckoutSession(sessionId: string): Promise<BookingRow | null> {
    const { data: booking, error } = await this.admin
      .from("priced_bookings")
      .select("*")
      .eq("checkout_session_id", sessionId)
      .single();

    if (error || !booking) return null;
    return booking as BookingRow;
  }

  async confirmPayment(
    id: string,
    paymentIntentId: string | null
  ): Promise<void> {
    const { error } = await this.admin
      .from("priced_bookings")
      .update({
        status: "confirmed",
        payment_status: "paid",
        payment_intent_id: paymentIntentId,
        confirmed_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("Booking update failed:", error);
      throw new Error("Failed to confirm booking");
    }
  }
}
