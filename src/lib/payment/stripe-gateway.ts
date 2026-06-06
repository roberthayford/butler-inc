import Stripe from "stripe";
import { getSiteUrl } from "@/lib/site-url";
import type {
  PaymentGateway,
  CheckoutSessionRequest,
  CheckoutSessionResult,
  SubscriptionCheckoutRequest,
  PortalSessionRequest,
  WebhookEvent,
  SubscriptionData,
  InvoiceData,
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
    const origin = getSiteUrl();
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
    // Pass the app-managed portal configuration explicitly when set (printed by
    // scripts/stripe/setup-products.mjs). Without it, Stripe uses the account
    // default config, which may not allow tier switching / at-period-end cancel.
    const configuration = process.env.STRIPE_PORTAL_CONFIGURATION_ID;
    const session = await this.stripe.billingPortal.sessions.create({
      customer: req.customerId,
      return_url: req.returnUrl,
      ...(configuration ? { configuration } : {}),
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
    rawBody: string,
    signature: string | null
  ): Promise<WebhookEvent> {
    if (!signature) {
      throw new Error("Missing Stripe signature header");
    }
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      throw new Error(
        "STRIPE_WEBHOOK_SECRET is required to verify Stripe webhooks"
      );
    }
    // Real HMAC verification + JSON parse in one call. Throws
    // StripeSignatureVerificationError (message contains "signature") on a bad
    // signature, which the webhook route maps to HTTP 400.
    const event = this.stripe.webhooks.constructEvent(rawBody, signature, secret);
    return this.normalizeEvent(event);
  }

  /** Map a verified Stripe.Event into our gateway-normalized WebhookEvent union. */
  private async normalizeEvent(event: Stripe.Event): Promise<WebhookEvent> {
    switch (event.type) {
      case "checkout.session.completed": {
        const webhookSession = event.data.object as Stripe.Checkout.Session;
        // line_items + period dates are not on the webhook session payload, and
        // the webhook copy's `subscription` can lag. Retrieve the authoritative
        // session expanding both, then read everything off `full`. Periods live
        // on subscription items in this API version.
        const full = await this.stripe.checkout.sessions.retrieve(
          webhookSession.id,
          { expand: ["line_items", "subscription"] }
        );
        const lineItems = (full.line_items?.data ?? []).map((li) => ({
          price: { id: toId(li.price) },
        }));
        const subscriptionId = toId(full.subscription);
        let current_period_start = 0;
        let current_period_end = 0;
        if (full.subscription && typeof full.subscription === "object") {
          const period = periodFromItems(full.subscription);
          current_period_start = period.start;
          current_period_end = period.end;
        } else if (subscriptionId) {
          // Defensive: subscription returned un-expanded as an id string.
          const sub = await this.stripe.subscriptions.retrieve(subscriptionId);
          const period = periodFromItems(sub);
          current_period_start = period.start;
          current_period_end = period.end;
        }
        return {
          type: "checkout.session.completed",
          created: event.created,
          id: event.id,
          data: {
            id: full.id,
            mode: full.mode === "payment" ? "payment" : "subscription",
            client_reference_id: full.client_reference_id ?? null,
            customer: toId(full.customer),
            subscription: subscriptionId || null,
            current_period_start,
            current_period_end,
            line_items: lineItems,
          },
        };
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        return {
          type: event.type,
          created: event.created,
          id: event.id,
          data: subscriptionData(event.data.object as Stripe.Subscription),
        };
      }
      case "invoice.paid":
      case "invoice.payment_failed": {
        return {
          type: event.type,
          created: event.created,
          id: event.id,
          data: invoiceData(event.data.object as Stripe.Invoice),
        };
      }
      default:
        return {
          type: "unhandled",
          created: event.created,
          id: event.id,
          rawType: event.type,
        };
    }
  }
}

/** Item-level billing period (periods live on subscription items in this API version). */
function periodFromItems(sub: Stripe.Subscription): { start: number; end: number } {
  const item = sub.items?.data?.[0];
  return {
    start: item?.current_period_start ?? 0,
    end: item?.current_period_end ?? 0,
  };
}

function subscriptionData(sub: Stripe.Subscription): SubscriptionData {
  const period = periodFromItems(sub);
  // Stripe keeps status "active" when pause_collection is set; surface "paused"
  // so the webhook handler does not reconcile a self-serve pause back to active.
  const status = sub.pause_collection ? "paused" : sub.status;
  return {
    id: sub.id,
    customer: toId(sub.customer),
    status,
    cancel_at_period_end: sub.cancel_at_period_end,
    current_period_start: period.start,
    current_period_end: period.end,
    pause_collection: sub.pause_collection
      ? { behavior: sub.pause_collection.behavior }
      : null,
    items: {
      data: (sub.items?.data ?? []).map((i) => ({ price: { id: toId(i.price) } })),
    },
  };
}

function invoiceData(inv: Stripe.Invoice): InvoiceData {
  return {
    id: inv.id ?? "",
    customer: toId(inv.customer),
    subscription: invoiceSubscriptionId(inv),
    period_start: inv.period_start,
    period_end: inv.period_end,
    status: inv.status ?? "draft",
  };
}

/** Resolve the subscription id from an invoice (parent.subscription_details in this API version). */
function invoiceSubscriptionId(inv: Stripe.Invoice): string | null {
  const fromParent = inv.parent?.subscription_details?.subscription;
  if (fromParent) return toId(fromParent);
  // Defensive: some payload shapes expose a top-level subscription field.
  const legacy = (
    inv as unknown as { subscription?: string | { id: string } | null }
  ).subscription;
  return legacy ? toId(legacy) : null;
}
