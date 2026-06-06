import { after } from "next/server";
import { Resend } from "resend";
import { render } from "@react-email/components";
import { getPaymentGateway } from "@/lib/payment/gateway";
import { getBookingRepository, type BookingRow, type BookingRepository } from "@/lib/payment/booking-repository";
import { createServiceClient } from "@/lib/supabase/server";
import { BookingConfirmationEmail } from "@/emails/booking-confirmation";
import { BookingNotificationEmail } from "@/emails/booking-notification";
import { formatButlerName } from "@/emails/format";
import type { PaymentGateway } from "@/lib/payment/types";

export type FulfilResult =
  | { status: "fulfilled"; bookingReference: string }
  | { status: "already_paid"; bookingReference: string }
  | { status: "not_found" }
  | { status: "unverified" };

export interface FulfilBookingDeps {
  gateway: Pick<PaymentGateway, "verifyPayment">;
  repo: Pick<BookingRepository, "findByCheckoutSession" | "confirmPayment">;
  /** Decrement the member's personal hours for a member-rate booking. */
  decrementHours: (booking: BookingRow) => Promise<void>;
  /** Send confirmation + admin notification emails (fire-and-forget). */
  sendEmails: (booking: BookingRow) => void;
}

/**
 * Fulfil a one-off butler booking after successful payment. Shared by the mock
 * `/api/webhooks/payment-complete` route and the real-Stripe `/api/webhooks/stripe`
 * `checkout.session.completed` (mode=payment) branch, so both gateways behave
 * identically (idempotency, member-hours decrement, emails).
 *
 * Hard failures (e.g. confirmPayment rejects) propagate so the caller can return
 * 500 and let Stripe retry. Member-hours and email failures are non-fatal.
 */
export async function fulfilBooking(
  sessionId: string,
  deps: Partial<FulfilBookingDeps> = {}
): Promise<FulfilResult> {
  const gateway = deps.gateway ?? getPaymentGateway();
  const repo = deps.repo ?? getBookingRepository();
  const decrementHours = deps.decrementHours ?? defaultDecrementHours;
  const sendEmails = deps.sendEmails ?? defaultSendEmails;

  const verification = await gateway.verifyPayment(sessionId);
  if (!verification.verified) return { status: "unverified" };

  const booking = await repo.findByCheckoutSession(sessionId);
  if (!booking) return { status: "not_found" };

  if (booking.payment_status === "paid") {
    return { status: "already_paid", bookingReference: booking.booking_reference };
  }

  // Throws on hard failure → caller returns 500, Stripe retries.
  await repo.confirmPayment(booking.id, verification.paymentIntentId ?? null);

  // Member-rate bookings made by an authenticated member decrement hours.
  if (booking.user_id && booking.urgency_label === "Member rate") {
    try {
      await decrementHours(booking);
    } catch (err) {
      // Non-fatal: the booking is paid; admin reconciliation can catch drift.
      console.error(
        "[fulfilBooking] member hour decrement failed for booking",
        booking.booking_reference,
        err
      );
    }
  }

  sendEmails(booking);

  return { status: "fulfilled", bookingReference: booking.booking_reference };
}

/** Atomic optimistic-lock decrement of the member's personal hours. */
async function defaultDecrementHours(booking: BookingRow): Promise<void> {
  const admin = createServiceClient();
  const { data: membership } = await admin
    .from("memberships")
    .select("id, personal_hours_used")
    .eq("user_id", booking.user_id as string)
    .eq("status", "active")
    .maybeSingle();

  if (!membership) return;

  const newUsed = membership.personal_hours_used + booking.duration_hours;
  const { error } = await admin
    .from("memberships")
    .update({
      personal_hours_used: newUsed,
      updated_at: new Date().toISOString(),
    })
    .eq("id", membership.id)
    .eq("personal_hours_used", membership.personal_hours_used); // optimistic lock

  if (error) {
    // Surfaced to fulfilBooking's catch — logged, non-fatal. DB CHECK
    // constraint enforces the cap if a race slipped through.
    throw error;
  }
}

/** Render + send confirmation (customer) and notification (admin) emails. */
function defaultSendEmails(booking: BookingRow): void {
  after(async () => {
    try {
      const resendKey = process.env.RESEND_API_KEY;
      if (!resendKey || resendKey === "your-resend-api-key") {
        console.warn("[fulfilBooking] Skipping email — no valid Resend key");
        return;
      }

      const resend = new Resend(resendKey);
      const currencyFormatter = new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: "GBP",
      });

      const emailProps = {
        reference: booking.booking_reference,
        butlerType: booking.butler_type,
        serviceOption: booking.service_option,
        dayOption: "advance" as const,
        specificDate: booking.service_date,
        timeSlot: `${booking.start_time}–${booking.end_time}`,
        name: booking.customer_name,
        email: booking.customer_email,
        phone: booking.customer_phone,
        notes: booking.additional_notes,
        formattedDate: booking.service_date,
        priceLabel: currencyFormatter.format(booking.total_price),
        timeSlotLabel: `${booking.start_time} – ${booking.end_time} (${booking.duration_hours} hours)`,
      };

      const [confirmHtml, confirmText, notifyHtml, notifyText] = await Promise.all([
        render(BookingConfirmationEmail(emailProps)),
        render(BookingConfirmationEmail(emailProps), { plainText: true }),
        render(BookingNotificationEmail(emailProps)),
        render(BookingNotificationEmail(emailProps), { plainText: true }),
      ]);

      await Promise.all([
        resend.emails.send({
          from: "Butlers Inc. <bookings@butlersinc.com>",
          to: booking.customer_email,
          subject: `Booking Confirmed: ${booking.booking_reference} · Butlers Inc.`,
          html: confirmHtml,
          text: confirmText,
        }),
        resend.emails.send({
          from: "Butlers Inc. <bookings@butlersinc.com>",
          to: "hello@butlersinc.com",
          subject: `New Booking: ${booking.booking_reference} · ${formatButlerName(booking.butler_type)}`,
          html: notifyHtml,
          text: notifyText,
        }),
      ]);
    } catch (emailError) {
      console.error("[fulfilBooking] Email failed:", emailError);
    }
  });
}
