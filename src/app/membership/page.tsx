import type { Metadata } from "next";
import { TierComparison } from "@/components/membership/TierComparison";

export const metadata: Metadata = {
  title: "Become a member | Butlers Inc.",
  description: "Membership unlocks the flat £50/hr rate, the same whether you book in three weeks or three hours.",
};

export default function MembershipPage() {
  return (
    <div className="min-h-screen bg-charcoal py-14 px-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="font-serif text-5xl font-semibold text-optical-white text-center tracking-tight mb-3">
          Become a member
        </h1>
        <p className="font-serif italic text-lg text-optical-white/85 text-center max-w-2xl mx-auto leading-relaxed mb-5">
          Membership unlocks the flat £50/hr rate (the same whether you book in three weeks or three hours) plus a monthly allowance of butler hours and virtual tasks.
        </p>
        <div className="flex justify-center gap-7 text-sm text-warm-gray mb-9">
          <div><span className="text-brass">·</span> Same rate, every booking</div>
          <div><span className="text-brass">·</span> No urgency surcharges</div>
          <div><span className="text-brass">·</span> Hours reset monthly</div>
        </div>
        <TierComparison />
        <p className="text-center text-warm-gray/70 text-xs mt-8">
          Cancel, upgrade, or pause anytime.
        </p>
      </div>
    </div>
  );
}
