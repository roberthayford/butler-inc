import type { PaymentGateway } from "@/lib/payment/types";
import { MockPaymentGateway } from "./mock-gateway";
import { StripeGateway } from "./stripe-gateway";

export function getPaymentGateway(): PaymentGateway {
  const provider = process.env.PAYMENT_GATEWAY ?? "mock";

  if (provider === "stripe") {
    return new StripeGateway();
  }

  // Vercel sets NODE_ENV=production for ALL deploys (preview, staging, production),
  // so we use VERCEL_ENV (which is 'production' | 'preview' | 'development') to
  // distinguish real production from staging/preview where we still want mock to
  // work until Stripe is wired. Local dev has VERCEL_ENV undefined → mock OK.
  if (provider === "mock" && process.env.VERCEL_ENV === "production") {
    throw new Error(
      "Mock payment gateway cannot be used in production. Set PAYMENT_GATEWAY=stripe and configure Stripe credentials."
    );
  }

  return new MockPaymentGateway();
}
