import type {
  PaymentGateway,
  CheckoutSessionRequest,
  CheckoutSessionResult,
} from "@/lib/pricing/types";

export class MockPaymentGateway implements PaymentGateway {
  private sessions = new Set<string>();

  async createCheckoutSession(
    request: CheckoutSessionRequest
  ): Promise<CheckoutSessionResult> {
    const sessionId = `mock_session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.sessions.add(sessionId);

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
    if (!sessionId || !this.sessions.has(sessionId)) {
      return { verified: false };
    }

    // Consume the session — prevents replay attacks
    this.sessions.delete(sessionId);

    return {
      verified: true,
      paymentIntentId: `mock_pi_${Date.now()}`,
    };
  }
}
