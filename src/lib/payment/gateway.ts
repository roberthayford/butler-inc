import type { PaymentGateway } from "@/lib/pricing/types";
import { MockPaymentGateway } from "./mock-gateway";

export function getPaymentGateway(): PaymentGateway {
  const provider = process.env.PAYMENT_GATEWAY ?? "mock";

  if (provider === "stripe") {
    throw new Error(
      "Stripe gateway not yet implemented. Set PAYMENT_GATEWAY=mock or add Stripe credentials."
    );
  }

  if (provider === "mock" && process.env.NODE_ENV === "production") {
    throw new Error(
      "Mock payment gateway cannot be used in production. Set PAYMENT_GATEWAY=stripe and configure Stripe credentials."
    );
  }

  return new MockPaymentGateway();
}
