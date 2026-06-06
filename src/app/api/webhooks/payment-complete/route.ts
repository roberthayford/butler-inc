import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { webhookLimiter } from "@/lib/rate-limit";
import { fulfilBooking } from "@/lib/payment/booking-fulfilment";

const webhookSchema = z.object({
  session_id: z.string().min(1),
});

// Mock-mode one-off booking fulfilment: the simulator POSTs here after a
// synthetic payment. Real Stripe fulfils the same booking via
// /api/webhooks/stripe (checkout.session.completed, mode=payment). Both share
// fulfilBooking() so behavior is identical.
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limit = webhookLimiter.check(ip);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await request.json();
  const parsed = webhookSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
  }

  let result;
  try {
    result = await fulfilBooking(parsed.data.session_id);
  } catch {
    return NextResponse.json({ error: "Failed to confirm booking" }, { status: 500 });
  }

  switch (result.status) {
    case "unverified":
      return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
    case "not_found":
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    case "already_paid":
      return NextResponse.json({ success: true, already_processed: true });
    case "fulfilled":
      return NextResponse.json({ success: true, bookingReference: result.bookingReference });
    default: {
      // Exhaustiveness guard: a new FulfilResult status must be handled above.
      const _exhaustive: never = result;
      void _exhaustive;
      return NextResponse.json({ error: "Unhandled fulfilment status" }, { status: 500 });
    }
  }
}
