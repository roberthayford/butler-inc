import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { priceLimiter } from "@/lib/rate-limit";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { BUTLER_PRICING, URGENCY_MULTIPLIERS } from "@/data/pricing-config";
import {
  calculatePricePreview,
  validateBookingTime,
} from "@/lib/pricing/calculate-price";
import { readActiveMembership } from "@/lib/membership/membership-reader";
import { todayUK } from "@/lib/dates/today-uk";
import type { ButlerTypeKey } from "@/data/butler-tasks";

const priceRequestSchema = z.object({
  butlerType: z.enum(["busy", "baby", "bougie", "base", "budget", "bespoke"]),
  serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  serviceStartsAtUtc: z.string().datetime().optional(),
});

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limit = priceLimiter.check(ip);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  const body = await request.json();
  const parsed = priceRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { butlerType, serviceDate, startTime, endTime, serviceStartsAtUtc } = parsed.data;
  const pricing = BUTLER_PRICING[butlerType as ButlerTypeKey];

  if (!pricing || !pricing.isActive) {
    return NextResponse.json(
      { error: "Invalid or inactive butler type" },
      { status: 400 }
    );
  }

  if (pricing.bookingType === "consultation") {
    return NextResponse.json(
      { error: "This butler type uses the consultation flow, not self-service pricing" },
      { status: 400 }
    );
  }

  const validation = validateBookingTime(
    startTime,
    endTime,
    pricing.minimumHours,
    serviceDate,
    pricing.leadTimeHours,
    serviceStartsAtUtc
  );

  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  // Server-derived membership: client cannot forge this — read from session.
  // Uses readActiveMembership which lazy-resets the billing period via the
  // service-role client and gates `isActive` on status='active' AND period
  // covering today (so a lapsed member doesn't get the member rate).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const admin = createServiceClient();
  const { isActive: isMember } = await readActiveMembership(
    user?.id ?? null,
    supabase,
    admin,
    todayUK()
  );

  const result = calculatePricePreview({
    hourlyRate: pricing.hourlyRate,
    startTime,
    endTime,
    serviceDate,
    multipliers: URGENCY_MULTIPLIERS,
    isMember,
  });

  return NextResponse.json({
    butlerType: pricing.id,
    tierName: pricing.name,
    ...result,
    currency: "gbp",
  });
}
