import type { Metadata } from "next";
import { CheckoutActivating } from "./CheckoutActivating";

export const metadata: Metadata = { title: "Activating membership" };

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-charcoal flex items-center justify-center px-6">
      <CheckoutActivating />
    </div>
  );
}
