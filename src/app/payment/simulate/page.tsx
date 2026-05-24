"use client";

import { useSearchParams, useRouter, type ReadonlyURLSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { getTierBySlug } from "@/data/membership-config";
import type { TierSlug } from "@/types/membership";

// ---------------------------------------------------------------------------
// Subscription approval sub-component
// ---------------------------------------------------------------------------

function SubscriptionApproval({
  searchParams,
}: {
  searchParams: ReadonlyURLSearchParams;
}) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sessionId = searchParams.get("session_id");
  const tierSlug = searchParams.get("tier") as TierSlug | null;
  const priceId = searchParams.get("price_id");
  const userId = searchParams.get("user_id");
  const email = searchParams.get("email");
  const successUrl = searchParams.get("success_url");
  const cancelUrl = searchParams.get("cancel_url");

  const tier = tierSlug ? getTierBySlug(tierSlug) : undefined;

  const handleApprove = async () => {
    if (!sessionId) return;
    setProcessing(true);
    setError(null);

    try {
      const created = Math.floor(Date.now() / 1000);
      const thirtyDays = 30 * 24 * 60 * 60;

      const syntheticEvent = {
        type: "checkout.session.completed",
        created,
        data: {
          id: sessionId,
          client_reference_id: userId ?? "",
          customer: `mock_cus_${userId ?? "unknown"}`,
          subscription: `mock_sub_${userId ?? "unknown"}_${created}`,
          current_period_start: created,
          current_period_end: created + thirtyDays,
          line_items: [{ price: { id: priceId ?? "" } }],
        },
      };

      const res = await fetch("/api/webhooks/stripe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-mock-signature": "1",
        },
        body: JSON.stringify(syntheticEvent),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Subscription processing failed");
      }

      const resolvedUrl = (successUrl ?? "/members/dashboard").replace(
        "{CHECKOUT_SESSION_ID}",
        sessionId
      );
      window.location.href = resolvedUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setProcessing(false);
    }
  };

  const handleCancel = () => {
    window.location.href = cancelUrl ?? "/membership";
  };

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-serif font-bold text-optical-white mb-4">
            Invalid Session
          </h1>
          <p className="text-warm-gray mb-6">
            No subscription session found. Please start again.
          </p>
          <Link
            href="/membership"
            className="text-brass-text hover:text-brass-muted transition-colors"
          >
            Back to Membership
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-charcoal flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        <div className="bg-primary-foreground/5 border border-primary-foreground/10 rounded-sm overflow-hidden">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-primary-foreground/10">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-amber-500/80" />
              <span className="text-xs uppercase tracking-widest text-amber-500/80 font-medium">
                Sandbox Mode
              </span>
            </div>
            <h1 className="text-xl font-serif font-semibold text-optical-white">
              {tier ? `Subscribe to ${tier.name}` : "Subscription Checkout"}
            </h1>
            <p className="text-warm-gray text-sm mt-1">
              This is a simulated subscription page for development.
            </p>
          </div>

          {/* Subscription summary */}
          <div className="px-6 py-5 space-y-4">
            {email && (
              <div>
                <p className="text-xs uppercase tracking-wider text-warm-gray/60 mb-1">
                  Email
                </p>
                <p className="text-optical-white text-sm">{email}</p>
              </div>
            )}

            {tier && (
              <>
                <div>
                  <p className="text-xs uppercase tracking-wider text-warm-gray/60 mb-1">
                    Plan
                  </p>
                  <p className="text-optical-white text-sm font-medium">
                    {tier.name} Membership
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wider text-warm-gray/60 mb-2">
                    Includes
                  </p>
                  <ul className="space-y-1">
                    <li className="text-optical-white text-sm flex items-center gap-2">
                      <span className="text-brass-text">·</span>
                      {tier.personalHoursIncluded} personal butler hours / month
                    </li>
                    <li className="text-optical-white text-sm flex items-center gap-2">
                      <span className="text-brass-text">·</span>
                      {tier.virtualTasksIncluded} virtual butler tasks / month
                    </li>
                  </ul>
                </div>

                <div className="pt-3 border-t border-primary-foreground/10">
                  <div className="flex items-baseline justify-between">
                    <span className="text-warm-gray text-sm">Monthly total</span>
                    <span className="text-2xl font-serif font-bold text-optical-white">
                      £{tier.monthlyPrice}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="px-6 pb-6 space-y-3">
            {error && (
              <p className="text-destructive text-sm text-center" role="alert">
                {error}
              </p>
            )}

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={handleApprove}
              disabled={processing}
              className="w-full py-3.5 rounded-sm bg-brass text-charcoal font-medium hover:bg-brass-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing
                ? "Processing..."
                : `Approve subscription · £${tier?.monthlyPrice ?? "?"}/mo`}
            </motion.button>

            <button
              type="button"
              onClick={handleCancel}
              className="block w-full py-3 rounded-sm border border-primary-foreground/20 text-optical-white text-center hover:bg-primary-foreground/10 transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </div>

        <p className="text-center text-warm-gray/40 text-xs mt-4">
          No real payment will be processed. This simulates the Stripe
          subscription checkout flow.
        </p>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Booking approval sub-component (existing one-off payment flow)
// ---------------------------------------------------------------------------

function BookingApproval({
  searchParams,
}: {
  searchParams: ReadonlyURLSearchParams;
}) {
  const router = useRouter();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sessionId = searchParams.get("session_id");
  const amount = searchParams.get("amount");
  const currency = searchParams.get("currency") ?? "gbp";
  const ref = searchParams.get("ref");
  const description = searchParams.get("description");
  const email = searchParams.get("email");

  const formattedAmount = amount
    ? new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: currency.toUpperCase(),
      }).format(Number(amount))
    : null;

  const handleComplete = async () => {
    if (!sessionId) return;
    setProcessing(true);
    setError(null);

    try {
      const res = await fetch("/api/webhooks/payment-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Payment processing failed");
      }

      router.push(`/booking-confirmation?ref=${ref}&session_id=${sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setProcessing(false);
    }
  };

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-serif font-bold text-optical-white mb-4">
            Invalid Session
          </h1>
          <p className="text-warm-gray mb-6">
            No payment session found. Please start your booking again.
          </p>
          <Link
            href="/butlers"
            className="text-brass-text hover:text-brass-muted transition-colors"
          >
            Back to Butlers
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-charcoal flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        {/* Mock checkout header */}
        <div className="bg-primary-foreground/5 border border-primary-foreground/10 rounded-sm overflow-hidden">
          <div className="px-6 pt-6 pb-4 border-b border-primary-foreground/10">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-amber-500/80" />
              <span className="text-xs uppercase tracking-widest text-amber-500/80 font-medium">
                Sandbox Mode
              </span>
            </div>
            <h1 className="text-xl font-serif font-semibold text-optical-white">
              Payment Checkout
            </h1>
            <p className="text-warm-gray text-sm mt-1">
              This is a simulated payment page for development.
            </p>
          </div>

          {/* Order summary */}
          <div className="px-6 py-5 space-y-4">
            {description && (
              <div>
                <p className="text-xs uppercase tracking-wider text-warm-gray/60 mb-1">
                  Service
                </p>
                <p className="text-optical-white text-sm">{description}</p>
              </div>
            )}

            {ref && (
              <div>
                <p className="text-xs uppercase tracking-wider text-warm-gray/60 mb-1">
                  Reference
                </p>
                <p className="text-optical-white text-sm font-mono">{ref}</p>
              </div>
            )}

            {email && (
              <div>
                <p className="text-xs uppercase tracking-wider text-warm-gray/60 mb-1">
                  Email
                </p>
                <p className="text-optical-white text-sm">{email}</p>
              </div>
            )}

            {formattedAmount && (
              <div className="pt-3 border-t border-primary-foreground/10">
                <div className="flex items-baseline justify-between">
                  <span className="text-warm-gray text-sm">Total</span>
                  <span className="text-2xl font-serif font-bold text-optical-white">
                    {formattedAmount}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="px-6 pb-6 space-y-3">
            {error && (
              <p className="text-destructive text-sm text-center" role="alert">
                {error}
              </p>
            )}

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={handleComplete}
              disabled={processing}
              className="w-full py-3.5 rounded-sm bg-brass text-charcoal font-medium hover:bg-brass-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? "Processing..." : `Pay ${formattedAmount ?? ""}`}
            </motion.button>

            <Link
              href="/butlers"
              className="block w-full py-3 rounded-sm border border-primary-foreground/20 text-optical-white text-center hover:bg-primary-foreground/10 transition-colors text-sm"
            >
              Cancel Payment
            </Link>
          </div>
        </div>

        <p className="text-center text-warm-gray/40 text-xs mt-4">
          No real payment will be processed. This simulates the Stripe Checkout flow.
        </p>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Router — branches on ?type=subscription
// ---------------------------------------------------------------------------

function SimulateContent() {
  const searchParams = useSearchParams();

  if (searchParams.get("type") === "subscription") {
    return <SubscriptionApproval searchParams={searchParams} />;
  }

  return <BookingApproval searchParams={searchParams} />;
}

// ---------------------------------------------------------------------------
// Page export — Suspense required for useSearchParams in App Router
// ---------------------------------------------------------------------------

export default function PaymentSimulatePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-charcoal flex items-center justify-center">
          <p className="text-warm-gray">Loading checkout...</p>
        </div>
      }
    >
      <SimulateContent />
    </Suspense>
  );
}
