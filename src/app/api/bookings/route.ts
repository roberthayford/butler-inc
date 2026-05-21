import { NextResponse, type NextRequest } from "next/server";
import { after } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { bookingLimiter } from "@/lib/rate-limit";
import { Resend } from "resend";
import { z } from "zod";
import { render } from "@react-email/components";
import { BookingConfirmationEmail } from "@/emails/booking-confirmation";
import { BookingNotificationEmail } from "@/emails/booking-notification";
import { formatBookingDate, getPriceLabel, getTimeSlotLabel } from "@/lib/utils";
import { phoneNumberSchema } from "@/lib/phone";

const bookingSchema = z.object({
  butlerType: z.string(),
  serviceOption: z.string().nullable(),
  customDescription: z.string().optional(),
  dayOption: z.enum(["sameDay", "nextDay", "advance"]),
  specificDate: z.string().optional(),
  timeSlot: z.enum(["morning", "noon", "evening"]),
  name: z.string().min(1),
  email: z.string().email(),
  phone: phoneNumberSchema,
  notes: z.string().max(500).optional(),
});

function generateReference(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "BT-";
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limit = bookingLimiter.check(ip);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  const body = await request.json();
  const parsed = bookingSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid booking data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const supabase = await createClient();
  const admin = createServiceClient();
  const reference = generateReference();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error: insertError } = await admin.from("bookings").insert({
    user_id: user?.id ?? null,
    butler_type: data.butlerType,
    service_option: data.serviceOption,
    day_option: data.dayOption,
    specific_date: data.specificDate ?? null,
    time_slot: data.timeSlot,
    name: data.name,
    email: data.email,
    phone: data.phone,
    notes:
      [data.notes, data.customDescription].filter(Boolean).join("\n") || null,
    reference,
    status: "pending",
  });

  if (insertError) {
    console.error("Booking insert failed:", insertError);
    return NextResponse.json(
      { error: "Failed to create booking" },
      { status: 500 }
    );
  }

  // server-after-nonblocking: send email without blocking the response
  after(async () => {
    console.log("[after] callback started for booking:", reference);
    try {
      const resendKey = process.env.RESEND_API_KEY;
      console.log("[after] RESEND_API_KEY present:", !!resendKey, "value starts with:", resendKey?.slice(0, 6));
      if (!resendKey || resendKey === "your-resend-api-key") {
        console.warn("[after] Skipping email — no valid Resend key");
        return;
      }

      const resend = new Resend(resendKey);

      const emailProps = {
        reference,
        butlerType: data.butlerType,
        serviceOption: data.serviceOption,
        dayOption: data.dayOption,
        specificDate: data.specificDate,
        timeSlot: data.timeSlot,
        name: data.name,
        email: data.email,
        phone: data.phone,
        notes: [data.notes, data.customDescription].filter(Boolean).join("\n") || null,
        formattedDate: formatBookingDate(data.dayOption, data.specificDate),
        priceLabel: getPriceLabel(data.dayOption),
        timeSlotLabel: getTimeSlotLabel(data.timeSlot),
      };

      console.log("[after] Rendering email templates for:", reference);
      const [confirmHtml, confirmText, notifyHtml, notifyText] = await Promise.all([
        render(BookingConfirmationEmail(emailProps)),
        render(BookingConfirmationEmail(emailProps), { plainText: true }),
        render(BookingNotificationEmail(emailProps)),
        render(BookingNotificationEmail(emailProps), { plainText: true }),
      ]);

      const isGenie = data.serviceOption === "genie";
      const adminSubject = isGenie
        ? `URGENT: Genie Wish ${reference} — Immediate Attention`
        : `New Booking: ${reference} — ${data.butlerType} Butler`;
      const customerSubject = isGenie
        ? `Wish Received: ${reference} — Butlers Inc.`
        : `Booking Confirmed: ${reference} — Butlers Inc.`;

      console.log("[after] Sending emails to:", "hello@butlersinc.com", "and", data.email);
      const results = await Promise.all([
        resend.emails.send({
          from: "Butlers Inc. <bookings@butlersinc.com>",
          to: "hello@butlersinc.com",
          subject: adminSubject,
          html: notifyHtml,
          text: notifyText,
        }),
        resend.emails.send({
          from: "Butlers Inc. <bookings@butlersinc.com>",
          to: data.email,
          subject: customerSubject,
          html: confirmHtml,
          text: confirmText,
        }),
      ]);
      console.log("[after] Email results:", JSON.stringify(results));
    } catch (emailError) {
      console.error("[after] Email sending failed:", emailError);
    }
  });

  return NextResponse.json({ reference, success: true });
}
