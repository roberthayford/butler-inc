import type { PaymentGateway } from "@/lib/payment/types";
import { MockPaymentGateway } from "./mock-gateway";
import { StripeGateway } from "./stripe-gateway";

export function getPaymentGateway(): PaymentGateway {
  const provider = process.env.PAYMENT_GATEWAY ?? "mock";

  if (provider === "stripe") {
    return new StripeGateway();
  }

  if (provider === "mock" && process.env.NODE_ENV === "production") {
    throw new Error(
      "Mock payment gateway cannot be used in production. Set PAYMENT_GATEWAY=stripe and configure Stripe credentials."
    );
  }

  return new MockPaymentGateway();
}
