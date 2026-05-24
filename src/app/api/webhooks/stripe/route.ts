import { NextResponse, type NextRequest } from "next/server";
import { getPaymentGateway } from "@/lib/payment/gateway";
import { createServiceClient } from "@/lib/supabase/server";
import {
  handleCheckoutCompleted,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handleInvoicePaid,
  handleInvoicePaymentFailed,
} from "@/lib/payment/webhook-handler";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const stripeSig = request.headers.get("stripe-signature");
  const mockSig = request.headers.get("x-mock-signature");
  const provider = process.env.PAYMENT_GATEWAY ?? "mock";

  // Signature gate
  if (provider === "stripe" && !stripeSig) {
    return NextResponse.json({ error: "missing stripe-signature" }, { status: 400 });
  }
  if (provider === "mock" && !mockSig && !stripeSig) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }

  let event;
  try {
    event = await getPaymentGateway().parseWebhookEvent(rawBody, stripeSig);
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  const db = createServiceClient();

  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event, db);
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
  }

  return NextResponse.json({ received: true });
}
