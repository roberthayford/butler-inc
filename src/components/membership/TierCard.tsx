import Link from "next/link";
import type { MembershipTier } from "@/types/membership";

interface Props { tier: MembershipTier; }

export function TierCard({ tier }: Props) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-sm p-7 flex flex-col gap-3">
      <h3 className="font-serif text-2xl font-semibold text-optical-white">{tier.name}</h3>
      <p className="text-sm text-warm-gray min-h-7">{tier.description}</p>
      <div className="font-serif text-4xl font-semibold text-optical-white">
        £{tier.monthlyPrice}<span className="text-sm text-warm-gray font-normal">/month</span>
      </div>
      <ul className="list-none p-0 my-2 text-sm space-y-1.5 text-optical-white/85">
        <li><span className="text-brass">·</span> {tier.personalHoursIncluded} personal butler hours</li>
        <li><span className="text-brass">·</span> {tier.virtualTasksIncluded} Virtual Butler tasks</li>
        <li><span className="text-brass">·</span> Flat £50/hr, no surcharges</li>
      </ul>
      <Link
        href={`/membership/checkout/${tier.slug}`}
        className="bg-brass text-charcoal py-2.5 px-4 text-center rounded-sm font-semibold text-sm mt-auto hover:bg-brass-muted transition-colors"
      >
        Choose {tier.name}
      </Link>
    </div>
  );
}
