import { describe, it, expect, beforeEach } from "vitest";
import { DevBookingStore } from "../dev-booking-store";
import type { BookingInsertData } from "../booking-repository";

const SAMPLE_INSERT: BookingInsertData = {
  booking_reference: "BI-20260328-X1Y2",
  butler_type: "busy",
  service_option: "errands",
  service_date: "2026-03-30",
  start_time: "09:00",
  end_time: "13:00",
  duration_hours: 4,
  hourly_rate: 50,
  urgency_multiplier: 1,
  urgency_label: null,
  subtotal: 200,
  total_price: 200,
  currency: "gbp",
  customer_name: "Jane Doe",
  customer_email: "jane@example.com",
  customer_phone: "+447700900000",
  additional_notes: null,
  status: "pending",
  payment_status: "pending",
};

describe("DevBookingStore", () => {
  let store: DevBookingStore;

  beforeEach(() => {
    store = new DevBookingStore();
  });

  describe("insertBooking", () => {
    it("returns a generated id", async () => {
      const result = await store.insertBooking(SAMPLE_INSERT);
      expect(result.id).toBeTruthy();
      expect(typeof result.id).toBe("string");
    });

    it("generates unique IDs for separate inserts", async () => {
      const a = await store.insertBooking(SAMPLE_INSERT);
      const b = await store.insertBooking(SAMPLE_INSERT);
      expect(a.id).not.toBe(b.id);
    });
  });

  describe("updateCheckoutSession", () => {
    it("sets the checkout_session_id on the booking", async () => {
      const { id } = await store.insertBooking(SAMPLE_INSERT);
      await store.updateCheckoutSession(id, "mock_session_abc");

      const booking = await store.findByCheckoutSession("mock_session_abc");
      expect(booking).not.toBeNull();
      expect(booking!.id).toBe(id);
    });
  });

  describe("findByCheckoutSession", () => {
    it("returns the booking matching the checkout session ID", async () => {
      const { id } = await store.insertBooking(SAMPLE_INSERT);
      await store.updateCheckoutSession(id, "mock_session_123");

      const booking = await store.findByCheckoutSession("mock_session_123");
      expect(booking).not.toBeNull();
      expect(booking!.booking_reference).toBe("BI-20260328-X1Y2");
      expect(booking!.customer_email).toBe("jane@example.com");
      expect(booking!.total_price).toBe(200);
      expect(booking!.payment_status).toBe("pending");
    });

    it("returns null for an unknown session ID", async () => {
      const booking = await store.findByCheckoutSession("nonexistent");
      expect(booking).toBeNull();
    });
  });

  describe("confirmPayment", () => {
    it("marks the booking as paid and confirmed", async () => {
      const { id } = await store.insertBooking(SAMPLE_INSERT);
      await store.updateCheckoutSession(id, "mock_session_pay");

      await store.confirmPayment(id, "mock_pi_12345");

      const booking = await store.findByCheckoutSession("mock_session_pay");
      expect(booking!.status).toBe("confirmed");
      expect(booking!.payment_status).toBe("paid");
      expect(booking!.payment_intent_id).toBe("mock_pi_12345");
      expect(booking!.confirmed_at).toBeTruthy();
    });

    it("accepts null paymentIntentId", async () => {
      const { id } = await store.insertBooking(SAMPLE_INSERT);
      await store.updateCheckoutSession(id, "mock_session_null");

      await store.confirmPayment(id, null);

      const booking = await store.findByCheckoutSession("mock_session_null");
      expect(booking!.payment_status).toBe("paid");
      expect(booking!.payment_intent_id).toBeNull();
    });
  });
});
