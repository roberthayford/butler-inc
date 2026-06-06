import { describe, expect, it, vi } from "vitest";
import { fulfilBooking } from "../booking-fulfilment";
import type { BookingRow } from "../booking-repository";

function makeBooking(overrides: Partial<BookingRow> = {}): BookingRow {
  return {
    id: "bk_1",
    booking_reference: "BUT-ABC123",
    butler_type: "budget",
    service_option: null,
    service_date: "2026-07-01",
    start_time: "09:00",
    end_time: "12:00",
    duration_hours: 3,
    hourly_rate: 50,
    urgency_multiplier: 1,
    urgency_label: null,
    subtotal: 150,
    total_price: 150,
    currency: "gbp",
    customer_name: "Guest",
    customer_email: "guest@example.com",
    customer_phone: "+44",
    additional_notes: null,
    status: "pending",
    payment_status: "unpaid",
    user_id: null,
    checkout_session_id: "cs_test_1",
    payment_intent_id: null,
    confirmed_at: null,
    created_at: "2026-06-06T00:00:00Z",
    ...overrides,
  };
}

function deps(over: Record<string, unknown> = {}) {
  return {
    gateway: {
      verifyPayment: vi
        .fn()
        .mockResolvedValue({ verified: true, paymentIntentId: "pi_1" }),
    },
    repo: {
      findByCheckoutSession: vi.fn().mockResolvedValue(makeBooking()),
      confirmPayment: vi.fn().mockResolvedValue(undefined),
    },
    decrementHours: vi.fn().mockResolvedValue(undefined),
    sendEmails: vi.fn(),
    ...over,
  };
}

describe("fulfilBooking", () => {
  it("confirms a verified, unpaid booking and reports fulfilled", async () => {
    const d = deps();
    const result = await fulfilBooking("cs_test_1", d as never);

    expect(result).toEqual({ status: "fulfilled", bookingReference: "BUT-ABC123" });
    expect(d.repo.confirmPayment).toHaveBeenCalledWith("bk_1", "pi_1");
    expect(d.sendEmails).toHaveBeenCalledTimes(1);
  });

  it("stops with unverified when the payment is not verified", async () => {
    const d = deps({
      gateway: { verifyPayment: vi.fn().mockResolvedValue({ verified: false }) },
    });
    const result = await fulfilBooking("cs_test_1", d as never);

    expect(result).toEqual({ status: "unverified" });
    expect(d.repo.confirmPayment).not.toHaveBeenCalled();
  });

  it("returns not_found when no booking matches the session", async () => {
    const d = deps({
      repo: {
        findByCheckoutSession: vi.fn().mockResolvedValue(null),
        confirmPayment: vi.fn(),
      },
    });
    const result = await fulfilBooking("cs_missing", d as never);

    expect(result).toEqual({ status: "not_found" });
    expect(d.repo.confirmPayment).not.toHaveBeenCalled();
  });

  it("is idempotent: an already-paid booking is not confirmed again", async () => {
    const d = deps({
      repo: {
        findByCheckoutSession: vi
          .fn()
          .mockResolvedValue(makeBooking({ payment_status: "paid" })),
        confirmPayment: vi.fn(),
      },
    });
    const result = await fulfilBooking("cs_test_1", d as never);

    expect(result).toEqual({ status: "already_paid", bookingReference: "BUT-ABC123" });
    expect(d.repo.confirmPayment).not.toHaveBeenCalled();
    expect((d as ReturnType<typeof deps>).sendEmails).not.toHaveBeenCalled();
  });

  it("decrements member hours for a member-rate booking", async () => {
    const booking = makeBooking({ user_id: "u1", urgency_label: "Member rate" });
    const d = deps({
      repo: {
        findByCheckoutSession: vi.fn().mockResolvedValue(booking),
        confirmPayment: vi.fn().mockResolvedValue(undefined),
      },
    });
    await fulfilBooking("cs_test_1", d as never);

    expect(d.decrementHours).toHaveBeenCalledWith(booking);
  });

  it("does not decrement hours for a non-member booking", async () => {
    const d = deps(); // default booking: user_id null, urgency_label null
    await fulfilBooking("cs_test_1", d as never);

    expect(d.decrementHours).not.toHaveBeenCalled();
  });

  it("propagates a hard confirmPayment failure (so the caller can 500/retry)", async () => {
    const d = deps({
      repo: {
        findByCheckoutSession: vi.fn().mockResolvedValue(makeBooking()),
        confirmPayment: vi.fn().mockRejectedValue(new Error("db down")),
      },
    });

    await expect(fulfilBooking("cs_test_1", d as never)).rejects.toThrow(/db down/);
  });
});
