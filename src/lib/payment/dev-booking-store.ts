import type {
  BookingInsertData,
  BookingRow,
  BookingRepository,
} from "./booking-repository";

export class DevBookingStore implements BookingRepository {
  private bookings = new Map<string, BookingRow>();
  private counter = 0;

  async insertBooking(data: BookingInsertData): Promise<{ id: string }> {
    const id = `dev_${Date.now()}_${++this.counter}`;
    const row: BookingRow = {
      ...data,
      id,
      checkout_session_id: null,
      payment_intent_id: null,
      confirmed_at: null,
      created_at: new Date().toISOString(),
    };
    this.bookings.set(id, row);
    return { id };
  }

  async updateCheckoutSession(id: string, sessionId: string): Promise<void> {
    const booking = this.bookings.get(id);
    if (booking) {
      booking.checkout_session_id = sessionId;
    }
  }

  async findByCheckoutSession(sessionId: string): Promise<BookingRow | null> {
    for (const booking of this.bookings.values()) {
      if (booking.checkout_session_id === sessionId) {
        return { ...booking };
      }
    }
    return null;
  }

  async confirmPayment(
    id: string,
    paymentIntentId: string | null
  ): Promise<void> {
    const booking = this.bookings.get(id);
    if (booking) {
      booking.status = "confirmed";
      booking.payment_status = "paid";
      booking.payment_intent_id = paymentIntentId;
      booking.confirmed_at = new Date().toISOString();
    }
  }
}
