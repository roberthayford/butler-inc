import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { BUTLER_PRICING, URGENCY_MULTIPLIERS } from "@/data/pricing-config";
import {
  calculatePricePreview,
  validateBookingTime,
} from "@/lib/pricing/calculate-price";
import type { ButlerTypeKey } from "@/data/butler-tasks";

const priceRequestSchema = z.object({
  butlerType: z.enum(["busy", "baby", "bougie", "base", "budget", "bespoke"]),
  serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = priceRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { butlerType, serviceDate, startTime, endTime } = parsed.data;
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
    serviceDate
  );

  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const result = calculatePricePreview({
    hourlyRate: pricing.hourlyRate,
    startTime,
    endTime,
    serviceDate,
    multipliers: URGENCY_MULTIPLIERS,
  });

  return NextResponse.json({
    butlerType: pricing.id,
    tierName: pricing.name,
    ...result,
    currency: "gbp",
  });
}
