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
import { readActiveMembership } from "@/lib/membership/membership-reader";
import { hasSufficientMemberHours } from "@/lib/membership/member-hours";
import { todayUK } from "@/lib/dates/today-uk";
import { createServiceClient } from "@/lib/supabase/server";
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
  try {
    return await handlePost(request);
  } catch (err) {
    console.error("[create-checkout-session] unhandled error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? `Checkout setup failed: ${err.message}`
            : "Checkout setup failed",
      },
      { status: 500 }
    );
  }
}

async function handlePost(request: NextRequest) {
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

  // Server-derived membership: never trust the client for pricing flags.
  // Also lazy-resets the billing period via the service-role client if
  // expired, and gates `isActive` on period covering today.
  const admin = createServiceClient();
  const { membership, isActive: isMember } = await readActiveMembership(
    user?.id ?? null,
    supabase,
    admin,
    todayUK()
  );

  const priceResult = calculatePricePreview({
    hourlyRate: pricing.hourlyRate,
    startTime: data.startTime,
    endTime: data.endTime,
    serviceDate: data.serviceDate,
    multipliers: URGENCY_MULTIPLIERS,
    isMember,
  });

  // Member bookings are covered by the monthly hour allowance. Gate the
  // booking on having enough remaining hours; the post-payment webhook
  // will atomically deduct them (with optimistic lock + CHECK constraint
  // as the race-safety net).
  if (isMember) {
    const membershipRow = membership as
      | { personal_hours_total: number; personal_hours_used: number }
      | null;
    if (!hasSufficientMemberHours(membershipRow, priceResult.durationHours)) {
      const remaining = membershipRow
        ? Math.max(0, membershipRow.personal_hours_total - membershipRow.personal_hours_used)
        : 0;
      return NextResponse.json(
        {
          error: "Insufficient member hours remaining for this booking",
          remaining,
          required: priceResult.durationHours,
        },
        { status: 400 }
      );
    }
  }

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
      user_id: user?.id ?? null,
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
    description: `${pricing.name}, ${data.serviceDate}, ${data.startTime}-${data.endTime} (${priceResult.durationHours} hours)`,
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
