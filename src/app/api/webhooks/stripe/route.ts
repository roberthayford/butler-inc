import { NextResponse, type NextRequest } from "next/server";
import { getPaymentGateway } from "@/lib/payment/gateway";
import { createServiceClient } from "@/lib/supabase/server";
import { requireGatewayConfigured } from "@/lib/payment/require-gateway-configured";
import { verifyMockWebhook } from "@/lib/payment/mock-webhook-signature";
import {
  handleCheckoutCompleted,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handleInvoicePaid,
  handleInvoicePaymentFailed,
} from "@/lib/payment/webhook-handler";
import { fulfilBooking } from "@/lib/payment/booking-fulfilment";

export async function POST(request: NextRequest) {
  const guard = requireGatewayConfigured();
  if (!guard.ok) return guard.response;

  const rawBody = await request.text();
  const stripeSig = request.headers.get("stripe-signature");
  const mockSig = request.headers.get("x-mock-signature");
  const provider = process.env.PAYMENT_GATEWAY;

  // Signature gate
  if (provider === "stripe" && !stripeSig) {
    return NextResponse.json({ error: "missing stripe-signature" }, { status: 400 });
  }
  if (provider === "mock") {
    // HMAC-SHA256(rawBody, MOCK_WEBHOOK_SECRET) required. The pre-fix gate
    // accepted any non-empty x-mock-signature value, which on internet-facing
    // staging let any attacker forge events. verifyMockWebhook fails closed
    // if the secret is unset.
    if (!verifyMockWebhook(rawBody, mockSig)) {
      return NextResponse.json({ error: "invalid x-mock-signature" }, { status: 400 });
    }
  }

  let event;
  try {
    event = await getPaymentGateway().parseWebhookEvent(rawBody, stripeSig);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("not yet implemented")) {
      return NextResponse.json({ error: "gateway not yet implemented" }, { status: 503 });
    }
    if (err instanceof SyntaxError || msg.includes("JSON")) {
      return NextResponse.json({ error: "invalid body" }, { status: 400 });
    }
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  const db = createServiceClient();

  switch (event.type) {
    case "checkout.session.completed":
      if (event.data.mode === "payment") {
        // One-off butler booking — fulfil it (verify, confirm, hours, email).
        // Soft outcomes are acknowledged; a thrown hard failure → 500 (Stripe retries).
        await fulfilBooking(event.data.id);
      } else {
        // Subscription checkout — membership provisioning.
        await handleCheckoutCompleted(event, db);
      }
      break;
    case "customer.subscription.updated":
      await handleSubscriptionUpdated(event, db);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event, db);
      break;
    case "invoice.paid":
      await handleInvoicePaid(event, db);
      break;
    case "invoice.payment_failed":
      await handleInvoicePaymentFailed(event, db);
      break;
    case "unhandled":
      // acknowledged but no-op — keeps Stripe from retrying
      break;
    default: {
      const _exhaustive: never = event;
      void _exhaustive;
      break;
    }
  }

  return NextResponse.json({ received: true });
}
