import { MEMBERSHIP_TIERS } from "@/data/membership-config";
import { TierCard } from "./TierCard";

export function TierComparison() {
  const tiers = MEMBERSHIP_TIERS.filter((t) => t.isActive).sort((a, b) => a.displayOrder - b.displayOrder);
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {tiers.map((tier) => <TierCard key={tier.id} tier={tier} />)}
    </div>
  );
}
