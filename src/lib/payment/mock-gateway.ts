import type {
  PaymentGateway,
  CheckoutSessionRequest,
  CheckoutSessionResult,
  SubscriptionCheckoutRequest,
  PortalSessionRequest,
  WebhookEvent,
} from "@/lib/payment/types";

const HANDLED_TYPES = new Set([
  "checkout.session.completed",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
]);

export class MockPaymentGateway implements PaymentGateway {
  async createCheckoutSession(
    request: CheckoutSessionRequest
  ): Promise<CheckoutSessionResult> {
    const sessionId = `mock_session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const params = new URLSearchParams({
      session_id: sessionId,
      amount: String(request.amount),
      currency: request.currency,
      ref: request.bookingReference,
      description: request.description,
      email: request.customerEmail,
    });

    return {
      sessionId,
      url: `/payment/simulate?${params.toString()}`,
    };
  }

  async verifyPayment(
    sessionId: string
  ): Promise<{ verified: boolean; paymentIntentId?: string }> {
    // Pattern verification only. Cross-request state (a Set on this instance)
    // doesn't survive Vercel serverless instances, so the mock can't track
    // "has this session ID been seen". Replay protection lives at the DB
    // layer: booking-repository.findByCheckoutSession returns the row only
    // if a booking was actually created with this session ID, and the
    // webhook short-circuits when payment_status === "paid".
    if (!sessionId || !sessionId.startsWith("mock_session_")) {
      return { verified: false };
    }

    return {
      verified: true,
      paymentIntentId: `mock_pi_${Date.now()}`,
    };
  }

  async createSubscriptionCheckoutSession(
    req: SubscriptionCheckoutRequest
  ): Promise<CheckoutSessionResult> {
    const sessionId = `mock_sub_session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const params = new URLSearchParams({
      type: "subscription",
      session_id: sessionId,
      tier: req.tier,
      price_id: req.priceId,
      user_id: req.userId,
      email: req.customerEmail,
      success_url: req.successUrl,
      cancel_url: req.cancelUrl,
    });
    return { sessionId, url: `/payment/simulate?${params.toString()}` };
  }

  async createPortalSession(
    req: PortalSessionRequest
  ): Promise<{ url: string }> {
    const params = new URLSearchParams({
      customer_id: req.customerId,
      return_url: req.returnUrl,
    });
    return { url: `/payment/simulate-portal?${params.toString()}` };
  }

  async pauseSubscription(_subscriptionId: string): Promise<void> {
    // Mock: no-op — synthetic webhook from the portal simulator will sync state
  }

  async resumeSubscription(_subscriptionId: string): Promise<void> {
    // Mock: no-op — synthetic webhook from the portal simulator will sync state
  }

  async parseWebhookEvent(
    rawBody: string,
    _signature: string | null
  ): Promise<WebhookEvent> {
    const parsed = JSON.parse(rawBody);
    const type = parsed.type as string;
    if (HANDLED_TYPES.has(type)) {
      if (!parsed.data || typeof parsed.data !== "object") {
        throw new Error(`webhook event '${type}' is missing required 'data' field`);
      }
      return parsed as WebhookEvent;
    }
    return { type: "unhandled", created: parsed.created ?? Date.now() / 1000, rawType: type };
  }
}
