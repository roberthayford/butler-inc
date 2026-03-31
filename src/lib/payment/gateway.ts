import type { PaymentGateway } from "@/lib/pricing/types";
import { MockPaymentGateway } from "./mock-gateway";

export function getPaymentGateway(): PaymentGateway {
  const provider = process.env.PAYMENT_GATEWAY ?? "mock";

  if (provider === "stripe") {
    // Future: return new StripePaymentGateway()
    throw new Error(
      "Stripe gateway not yet implemented. Set PAYMENT_GATEWAY=mock or add Stripe credentials."
    );
  }

  return new MockPaymentGateway();
}
