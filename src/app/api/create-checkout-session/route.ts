import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { bookingLimiter } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { BUTLER_PRICING, URGENCY_MULTIPLIERS } from "@/data/pricing-config";
import {
  calculatePricePreview,
  validateBookingTime,
} from "@/lib/pricing/calculate-price";
import { generateBookingReference } from "@/lib/pricing/booking-reference";
import { getPaymentGateway } from "@/lib/payment/gateway";
import { getBookingRepository } from "@/lib/payment/booking-repository";
import { phoneNumberSchema } from "@/lib/phone";
import type { ButlerTypeKey } from "@/data/butler-tasks";

const checkoutSchema = z.object({
  butlerType: z.enum(["busy", "baby", "bougie", "base", "budget", "bespoke"]),
  serviceOption: z.string().nullable(),
  customDescription: z.string().optional(),
  serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  serviceStartsAtUtc: z.string().datetime(),
  customerName: z.string().min(2, "Name must be at least 2 characters").optional(),
  customerEmail: z.string().email("Please enter a valid email").optional(),
  customerPhone: phoneNumberSchema,
  additionalNotes: z.string().max(500).optional(),
});

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
  const parsed = checkoutSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid booking data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const customerName = user
    ? ((user.user_metadata?.name as string | undefined)?.trim() ?? "")
    : (data.customerName?.trim() ?? "");
  const customerEmail = user?.email ?? data.customerEmail;

  if (customerName.length < 2 || !customerEmail) {
    return NextResponse.json(
      { error: "Name and email are required" },
      { status: 400 }
    );
  }

  const pricing = BUTLER_PRICING[data.butlerType as ButlerTypeKey];

  if (!pricing || !pricing.isActive) {
    return NextResponse.json(
      { error: "Invalid butler type" },
      { status: 400 }
    );
  }

  if (pricing.bookingType === "consultation") {
    return NextResponse.json(
      { error: "This butler type uses the consultation flow" },
      { status: 400 }
    );
  }

  const validation = validateBookingTime(
    data.startTime,
    data.endTime,
    pricing.minimumHours,
    data.serviceDate,
    pricing.leadTimeHours,
    data.serviceStartsAtUtc
  );

  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const priceResult = calculatePricePreview({
    hourlyRate: pricing.hourlyRate,
    startTime: data.startTime,
    endTime: data.endTime,
    serviceDate: data.serviceDate,
    multipliers: URGENCY_MULTIPLIERS,
  });

  const bookingReference = generateBookingReference();
  const repo = getBookingRepository();

  let bookingId: string;
  try {
    const result = await repo.insertBooking({
      booking_reference: bookingReference,
      butler_type: data.butlerType,
      service_option: data.serviceOption,
      service_date: data.serviceDate,
      start_time: data.startTime,
      end_time: data.endTime,
      duration_hours: priceResult.durationHours,
      hourly_rate: priceResult.hourlyRate,
      urgency_multiplier: priceResult.urgencyMultiplier,
      urgency_label: priceResult.urgencyLabel,
      subtotal: priceResult.subtotal,
      total_price: priceResult.total,
      currency: "gbp",
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: data.customerPhone,
      additional_notes:
        [data.additionalNotes, data.customDescription]
          .filter(Boolean)
          .join("\n") || null,
      status: "pending",
      payment_status: "pending",
    });
    bookingId = result.id;
  } catch {
    return NextResponse.json(
      { error: "Failed to create booking" },
      { status: 500 }
    );
  }

  const gateway = getPaymentGateway();
  const session = await gateway.createCheckoutSession({
    bookingId,
    bookingReference,
    amount: priceResult.total,
    currency: "gbp",
    description: `${pricing.name} — ${data.serviceDate}, ${data.startTime}–${data.endTime} (${priceResult.durationHours} hours)`,
    customerEmail,
    metadata: {
      booking_id: bookingId,
      booking_reference: bookingReference,
      butler_type: data.butlerType,
      service_date: data.serviceDate,
      start_time: data.startTime,
      end_time: data.endTime,
      duration_hours: String(priceResult.durationHours),
      urgency_multiplier: String(priceResult.urgencyMultiplier),
    },
  });

  await repo.updateCheckoutSession(bookingId, session.sessionId);

  return NextResponse.json({
    url: session.url,
    bookingReference,
    sessionId: session.sessionId,
  });
}
