import type { TierSlug } from "@/types/membership";

// ── one-off booking payments (existing) ─────────────────────
export interface CheckoutSessionRequest {
  bookingId: string;
  bookingReference: string;
  amount: number;
  currency: string;
  description: string;
  customerEmail: string;
  metadata: Record<string, string>;
}

export interface CheckoutSessionResult {
  sessionId: string;
  url: string;
}

// ── subscriptions (new) ──────────────────────────────────────
export interface SubscriptionCheckoutRequest {
  tier: TierSlug;
  priceId: string;
  userId: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
}

export interface PortalSessionRequest {
  customerId: string;
  returnUrl: string;
}

// ── webhook events (new, discriminated union) ────────────────
export interface CheckoutSessionData {
  id: string;
  client_reference_id: string | null;
  customer: string;
  subscription: string;
  current_period_start: number; // unix seconds
  current_period_end: number;
  line_items: Array<{ price: { id: string } }>;
}

export interface SubscriptionData {
  id: string;
  customer: string;
  status:
    | "active"
    | "past_due"
    | "canceled"
    | "paused"
    | "trialing"
    | "unpaid"
    | "incomplete"
    | "incomplete_expired";
  cancel_at_period_end: boolean;
  current_period_start: number;
  current_period_end: number;
  pause_collection: { behavior: string } | null;
  items: { data: Array<{ price: { id: string } }> };
}

export interface InvoiceData {
  id: string;
  customer: string;
  subscription: string | null;
  period_start: number;
  period_end: number;
  status: "draft" | "open" | "paid" | "uncollectible" | "void";
}

export type WebhookEvent =
  | {
      type: "checkout.session.completed";
      created: number;
      data: CheckoutSessionData;
    }
  | {
      type: "customer.subscription.updated";
      created: number;
      data: SubscriptionData;
    }
  | {
      type: "customer.subscription.deleted";
      created: number;
      data: SubscriptionData;
    }
  | { type: "invoice.paid"; created: number; data: InvoiceData }
  | { type: "invoice.payment_failed"; created: number; data: InvoiceData }
  | { type: "unhandled"; created: number; rawType: string };

// ── gateway interface ────────────────────────────────────────
export interface PaymentGateway {
  createCheckoutSession(
    req: CheckoutSessionRequest
  ): Promise<CheckoutSessionResult>;
  verifyPayment(
    sessionId: string
  ): Promise<{ verified: boolean; paymentIntentId?: string }>;

  createSubscriptionCheckoutSession(
    req: SubscriptionCheckoutRequest
  ): Promise<CheckoutSessionResult>;
  createPortalSession(req: PortalSessionRequest): Promise<{ url: string }>;
  pauseSubscription(subscriptionId: string): Promise<void>;
  resumeSubscription(subscriptionId: string): Promise<void>;
  parseWebhookEvent(
    rawBody: string,
    signature: string | null
  ): Promise<WebhookEvent>;
}
