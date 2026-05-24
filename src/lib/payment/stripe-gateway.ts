import type {
  PaymentGateway,
  CheckoutSessionRequest,
  CheckoutSessionResult,
  SubscriptionCheckoutRequest,
  PortalSessionRequest,
  WebhookEvent,
} from "./types";

const NOT_IMPLEMENTED = (method: string) =>
  new Error(`StripeGateway.${method}() is not yet implemented. Wire @stripe/stripe-node in a focused PR.`);

export class StripeGateway implements PaymentGateway {
  async createCheckoutSession(_req: CheckoutSessionRequest): Promise<CheckoutSessionResult> {
    throw NOT_IMPLEMENTED("createCheckoutSession");
  }
  async verifyPayment(_sessionId: string): Promise<{ verified: boolean; paymentIntentId?: string }> {
    throw NOT_IMPLEMENTED("verifyPayment");
  }
  async createSubscriptionCheckoutSession(_req: SubscriptionCheckoutRequest): Promise<CheckoutSessionResult> {
    throw NOT_IMPLEMENTED("createSubscriptionCheckoutSession");
  }
  async createPortalSession(_req: PortalSessionRequest): Promise<{ url: string }> {
    throw NOT_IMPLEMENTED("createPortalSession");
  }
  async pauseSubscription(_subscriptionId: string): Promise<void> {
    throw NOT_IMPLEMENTED("pauseSubscription");
  }
  async resumeSubscription(_subscriptionId: string): Promise<void> {
    throw NOT_IMPLEMENTED("resumeSubscription");
  }
  async parseWebhookEvent(_rawBody: string, _signature: string | null): Promise<WebhookEvent> {
    throw NOT_IMPLEMENTED("parseWebhookEvent");
  }
}
