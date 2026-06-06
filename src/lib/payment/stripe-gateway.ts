import Stripe from "stripe";
import type {
  PaymentGateway,
  CheckoutSessionRequest,
  CheckoutSessionResult,
  SubscriptionCheckoutRequest,
  PortalSessionRequest,
  WebhookEvent,
} from "./types";

/**
 * Pinned Stripe API version. Load-bearing: in this version
 * `current_period_start/end` live on subscription ITEMS
 * (`subscription.items.data[0]`), not on the Subscription object, and an
 * invoice's subscription is reached via
 * `invoice.parent.subscription_details.subscription`. The webhook mapping in
 * `parseWebhookEvent` depends on this version's shapes.
 */
export const STRIPE_API_VERSION = "2026-05-27.dahlia" as const;

const NOT_IMPLEMENTED = (method: string) =>
  new Error(`StripeGateway.${method}() is not yet implemented.`);

/**
 * Narrow structural surface of the Stripe SDK that StripeGateway depends on.
 * A real `Stripe` instance satisfies this; tests inject `vi.fn()` stubs so no
 * network or real SDK construction happens in unit tests.
 */
export interface StripeLike {
  checkout: {
    sessions: {
      create(
        params: Stripe.Checkout.SessionCreateParams
      ): Promise<Stripe.Checkout.Session>;
      retrieve(
        id: string,
        params?: Stripe.Checkout.SessionRetrieveParams
      ): Promise<Stripe.Checkout.Session>;
    };
  };
  billingPortal: {
    sessions: {
      create(
        params: Stripe.BillingPortal.SessionCreateParams
      ): Promise<Stripe.BillingPortal.Session>;
    };
  };
  subscriptions: {
    retrieve(
      id: string,
      params?: Stripe.SubscriptionRetrieveParams
    ): Promise<Stripe.Subscription>;
    update(
      id: string,
      params: Stripe.SubscriptionUpdateParams
    ): Promise<Stripe.Subscription>;
  };
  webhooks: {
    constructEvent(
      payload: string | Buffer,
      header: string | Buffer,
      secret: string
    ): Stripe.Event;
  };
}

function makeRealStripe(): StripeLike {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is required when PAYMENT_GATEWAY=stripe. Set it in your environment."
    );
  }
  return new Stripe(key, { apiVersion: STRIPE_API_VERSION });
}

export class StripeGateway implements PaymentGateway {
  private _client?: StripeLike;

  constructor(client?: StripeLike) {
    this._client = client;
  }

  /** Lazily construct the real Stripe client on first use (mock-mode never hits this). */
  private get stripe(): StripeLike {
    return (this._client ??= makeRealStripe());
  }

  async createCheckoutSession(
    _req: CheckoutSessionRequest
  ): Promise<CheckoutSessionResult> {
    throw NOT_IMPLEMENTED("createCheckoutSession");
  }

  async verifyPayment(
    _sessionId: string
  ): Promise<{ verified: boolean; paymentIntentId?: string }> {
    throw NOT_IMPLEMENTED("verifyPayment");
  }

  async createSubscriptionCheckoutSession(
    _req: SubscriptionCheckoutRequest
  ): Promise<CheckoutSessionResult> {
    throw NOT_IMPLEMENTED("createSubscriptionCheckoutSession");
  }

  async createPortalSession(
    req: PortalSessionRequest
  ): Promise<{ url: string }> {
    const session = await this.stripe.billingPortal.sessions.create({
      customer: req.customerId,
      return_url: req.returnUrl,
    });
    return { url: session.url };
  }

  async pauseSubscription(_subscriptionId: string): Promise<void> {
    throw NOT_IMPLEMENTED("pauseSubscription");
  }

  async resumeSubscription(_subscriptionId: string): Promise<void> {
    throw NOT_IMPLEMENTED("resumeSubscription");
  }

  async parseWebhookEvent(
    _rawBody: string,
    _signature: string | null
  ): Promise<WebhookEvent> {
    throw NOT_IMPLEMENTED("parseWebhookEvent");
  }
}
