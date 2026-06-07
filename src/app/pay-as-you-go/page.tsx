import type { Metadata } from "next";
import { ButlerCategoryGrid } from "@/components/landing/ButlerCategoryGrid";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { MembershipValueCallout } from "@/components/landing/MembershipValueCallout";
import { TierComparison } from "@/components/membership/TierComparison";
import { BackToHomeLink } from "@/components/BackToHomeLink";

export const metadata: Metadata = {
  title: "Pay As You Go | Butlers Inc.",
  description:
    "Book any of our six specialist butlers with no commitment. See how a membership can save you money on regular bookings.",
};

export default function PayAsYouGoPage() {
  return (
    <div className="bg-charcoal">
      <header className="pt-16 pb-4 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-serif font-bold text-optical-white tracking-tight">
            Pay As You Go
          </h1>
          <p className="mt-4 text-lg text-warm-gray max-w-2xl mx-auto leading-relaxed">
            Book any butler when you need one. No membership required.
          </p>
        </div>
      </header>

      <ButlerCategoryGrid showHeader={false} />

      <HowItWorks />

      <MembershipValueCallout />

      <section className="bg-charcoal py-20 md:py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-optical-white text-center mb-12 tracking-tight">
            Membership packages
          </h2>
          <TierComparison />
        </div>
      </section>

      <div className="text-center pb-16">
        <BackToHomeLink />
      </div>
    </div>
  );
}
