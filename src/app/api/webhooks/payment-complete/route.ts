import { NextResponse, type NextRequest } from "next/server";
import { after } from "next/server";
import { z } from "zod";
import { webhookLimiter } from "@/lib/rate-limit";
import { getPaymentGateway } from "@/lib/payment/gateway";
import { getBookingRepository } from "@/lib/payment/booking-repository";
import { createServiceClient } from "@/lib/supabase/server";
import { Resend } from "resend";
import { render } from "@react-email/components";
import { BookingConfirmationEmail } from "@/emails/booking-confirmation";
import { BookingNotificationEmail } from "@/emails/booking-notification";

const webhookSchema = z.object({
  session_id: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limit = webhookLimiter.check(ip);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429 }
    );
  }

  const body = await request.json();
  const parsed = webhookSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid webhook payload" },
      { status: 400 }
    );
  }

  const { session_id } = parsed.data;
  const gateway = getPaymentGateway();

  const verification = await gateway.verifyPayment(session_id);
  if (!verification.verified) {
    return NextResponse.json(
      { error: "Payment verification failed" },
      { status: 400 }
    );
  }

  const repo = getBookingRepository();

  const booking = await repo.findByCheckoutSession(session_id);
  if (!booking) {
    return NextResponse.json(
      { error: "Booking not found" },
      { status: 404 }
    );
  }

  if (booking.payment_status === "paid") {
    return NextResponse.json({ success: true, already_processed: true });
  }

  try {
    await repo.confirmPayment(
      booking.id,
      verification.paymentIntentId ?? null
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to confirm booking" },
      { status: 500 }
    );
  }

  // Member hours decrement — only for bookings made by an authenticated
  // member at member-rate. Detected by `urgency_label === "Member rate"`
  // (set server-side in /api/create-checkout-session when isActive=true).
  // Atomic via optimistic lock; DB CHECK constraint enforces the cap if
  // a race slipped through.
  if (booking.user_id && booking.urgency_label === "Member rate") {
    const admin = createServiceClient();
    const { data: membership } = await admin
      .from("memberships")
      .select("id, personal_hours_used")
      .eq("user_id", booking.user_id)
      .eq("status", "active")
      .maybeSingle();

    if (membership) {
      const newUsed = membership.personal_hours_used + booking.duration_hours;
      const { error: incrementError } = await admin
        .from("memberships")
        .update({
          personal_hours_used: newUsed,
          updated_at: new Date().toISOString(),
        })
        .eq("id", membership.id)
        .eq("personal_hours_used", membership.personal_hours_used); // optimistic lock

      if (incrementError) {
        // Race or CHECK violation — log but don't fail the webhook;
        // the booking is paid for and the user has the service.
        // Admin reconciliation can pick up the discrepancy.
        console.error(
          "[payment-complete] Member hour decrement failed for booking",
          booking.booking_reference,
          incrementError
        );
      }
    }
  }

  after(async () => {
    try {
      const resendKey = process.env.RESEND_API_KEY;
      if (!resendKey || resendKey === "your-resend-api-key") {
        console.warn("[payment-complete] Skipping email — no valid Resend key");
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

      const [confirmHtml, confirmText, notifyHtml, notifyText] =
        await Promise.all([
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
          subject: `New Booking: ${booking.booking_reference} · ${booking.butler_type} Butler`,
          html: notifyHtml,
          text: notifyText,
        }),
      ]);
    } catch (emailError) {
      console.error("[payment-complete] Email failed:", emailError);
    }
  });

  return NextResponse.json({
    success: true,
    bookingReference: booking.booking_reference,
  });
}
