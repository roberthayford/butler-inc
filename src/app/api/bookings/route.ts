import { NextResponse, type NextRequest } from "next/server";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Resend } from "resend";
import { z } from "zod";

const bookingSchema = z.object({
  butlerType: z.string(),
  serviceOption: z.string().nullable(),
  customDescription: z.string().optional(),
  dayOption: z.enum(["sameDay", "nextDay", "advance"]),
  specificDate: z.string().optional(),
  timeSlot: z.enum(["morning", "noon", "evening"]),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(10),
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
  const reference = generateReference();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error: insertError } = await supabase.from("bookings").insert({
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
    try {
      const resendKey = process.env.RESEND_API_KEY;
      if (!resendKey || resendKey === "your-resend-api-key") return;

      const resend = new Resend(resendKey);

      const priceLabel =
        data.dayOption === "sameDay"
          ? "£70/hr"
          : data.dayOption === "nextDay"
            ? "£55/hr"
            : "£35/hr";

      await Promise.all([
        resend.emails.send({
          from: "Butlers Inc. <bookings@butlersinc.co.uk>",
          to: "bookings@butlersinc.co.uk",
          subject: `New Booking: ${reference} - ${data.butlerType} Butler`,
          html: `
            <h2>New Booking Request</h2>
            <p><strong>Reference:</strong> ${reference}</p>
            <p><strong>Butler:</strong> ${data.butlerType}</p>
            <p><strong>Service:</strong> ${data.serviceOption ?? "Bespoke"}</p>
            <p><strong>When:</strong> ${data.dayOption} (${priceLabel}) - ${data.timeSlot}</p>
            ${data.specificDate ? `<p><strong>Date:</strong> ${data.specificDate}</p>` : ""}
            <p><strong>Name:</strong> ${data.name}</p>
            <p><strong>Email:</strong> ${data.email}</p>
            <p><strong>Phone:</strong> ${data.phone}</p>
            ${data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ""}
            ${data.customDescription ? `<p><strong>Custom request:</strong> ${data.customDescription}</p>` : ""}
          `,
        }),
        resend.emails.send({
          from: "Butlers Inc. <bookings@butlersinc.co.uk>",
          to: data.email,
          subject: `Booking Confirmed: ${reference} - Butlers Inc.`,
          html: `
            <h2>Your Booking is Confirmed</h2>
            <p>Thank you, ${data.name}! We've received your booking request.</p>
            <p><strong>Reference:</strong> ${reference}</p>
            <p><strong>Service:</strong> ${data.butlerType} Butler</p>
            <p>We'll be in touch within 30 minutes to confirm the details.</p>
            <p>If you have any questions, reply to this email or contact us at <a href="mailto:bookings@butlersinc.co.uk">bookings@butlersinc.co.uk</a>.</p>
          `,
        }),
      ]);
    } catch (emailError) {
      console.warn("Email sending failed (non-blocking):", emailError);
    }
  });

  return NextResponse.json({ reference, success: true });
}
