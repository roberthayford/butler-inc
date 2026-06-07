import Link from "next/link";

/**
 * "Membership is cheaper" section for the Pay-As-You-Go path.
 *
 * Grounded in the real pricing model (src/data/pricing-config.ts,
 * src/data/membership-config.ts, src/lib/pricing/calculate-price.ts):
 * non-members pay the butler's hourly rate plus an urgency surcharge on short
 * notice; members pay a flat £50/hr with no urgency surcharge and a prepaid
 * monthly allowance of butler hours and Virtual Butler tasks.
 *
 * NOTE: copy is a draft pending founder sign-off. No em dashes (copy rule).
 */
export function MembershipValueCallout() {
  return (
    <section className="bg-charcoal py-20 md:py-24 px-6">
      <div className="max-w-3xl mx-auto border-l-2 border-l-brass rounded-sm p-8">
        <h2 className="text-3xl sm:text-4xl font-serif font-bold text-optical-white tracking-tight">
          Members pay less, every time
        </h2>

        <div className="mt-6 space-y-4 text-warm-gray leading-relaxed">
          <p>
            Pay-as-you-go is simple: you pay the butler&apos;s hourly rate, and
            short-notice bookings add an urgency surcharge.
          </p>
          <p>
            Members skip both. Membership locks in a{" "}
            <span className="text-optical-white font-medium">
              flat £50 per hour
            </span>{" "}
            on every self-service butler, with{" "}
            <span className="text-optical-white font-medium">
              no urgency surcharge
            </span>
            , whether you book three weeks ahead or three hours ahead.
          </p>
          <p>
            Each plan also includes a{" "}
            <span className="text-optical-white font-medium">
              monthly allowance
            </span>{" "}
            of butler hours and Virtual Butler tasks, prepaid at the start of
            the month. If you book more than once or twice a month, a membership
            usually costs less than paying as you go.
          </p>
        </div>

        <div className="mt-8">
          <Link
            href="/membership"
            className="inline-block px-6 py-3 rounded-sm bg-brass text-charcoal font-medium hover:bg-brass-muted transition-colors text-sm tracking-wide"
          >
            See membership plans
          </Link>
        </div>
      </div>
    </section>
  );
}
