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

/** Coerce a Stripe field that may be an id string or an expanded object to its id. */
function toId(
  value: string | { id: string } | null | undefined
): string {
  if (!value) return "";
  return typeof value === "string" ? value : value.id;
}

/** Canonical site origin for building Checkout return URLs (no request available here). */
function siteOrigin(): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
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
    req: CheckoutSessionRequest
  ): Promise<CheckoutSessionResult> {
    const origin = siteOrigin();
    const session = await this.stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: req.customerEmail,
      client_reference_id: req.bookingId,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: req.currency,
            // request.amount is in pounds; Stripe unit_amount is the minor unit (pence).
            unit_amount: Math.round(req.amount * 100),
            product_data: { name: req.description },
          },
        },
      ],
      metadata: req.metadata,
      success_url: `${origin}/booking-confirmation?ref=${encodeURIComponent(
        req.bookingReference
      )}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/`,
    });
    return { sessionId: session.id, url: session.url ?? "" };
  }

  async verifyPayment(
    sessionId: string
  ): Promise<{ verified: boolean; paymentIntentId?: string }> {
    const session = await this.stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") {
      return { verified: false };
    }
    return { verified: true, paymentIntentId: toId(session.payment_intent) };
  }

  async createSubscriptionCheckoutSession(
    req: SubscriptionCheckoutRequest
  ): Promise<CheckoutSessionResult> {
    // Stripe rejects passing both `customer` and `customer_email`. Reuse an
    // existing customer when we have one, else let Checkout create it by email.
    const customerParams: Pick<
      Stripe.Checkout.SessionCreateParams,
      "customer" | "customer_email"
    > = req.customerId
      ? { customer: req.customerId }
      : { customer_email: req.customerEmail };

    const session = await this.stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: req.priceId, quantity: 1 }],
      client_reference_id: req.userId,
      ...customerParams,
      success_url: req.successUrl,
      cancel_url: req.cancelUrl,
      subscription_data: {
        metadata: { user_id: req.userId, tier: req.tier },
      },
    });
    return { sessionId: session.id, url: session.url ?? "" };
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

  async pauseSubscription(subscriptionId: string): Promise<void> {
    // `void` = don't generate invoices while paused (no charges). The resulting
    // customer.subscription.updated webhook carries pause_collection, which
    // parseWebhookEvent maps to status "paused" so the handler keeps it paused.
    await this.stripe.subscriptions.update(subscriptionId, {
      pause_collection: { behavior: "void" },
    });
  }

  async resumeSubscription(subscriptionId: string): Promise<void> {
    // Empty string clears pause_collection (Stripe's documented unset).
    await this.stripe.subscriptions.update(subscriptionId, {
      pause_collection: "",
    });
  }

  async parseWebhookEvent(
    _rawBody: string,
    _signature: string | null
  ): Promise<WebhookEvent> {
    throw NOT_IMPLEMENTED("parseWebhookEvent");
  }
}
