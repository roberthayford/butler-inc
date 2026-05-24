import type { TierSlug } from "@/types/membership";

const TIER_STYLES: Record<TierSlug, string> = {
  lite: "bg-zinc-700/50 text-zinc-300 border-zinc-600",
  frequent: "bg-brass/20 text-brass-text border-brass/40",
  pro: "bg-amber-900/30 text-amber-300 border-amber-700/40",
};

const TIER_LABELS: Record<TierSlug, string> = {
  lite: "Lite",
  frequent: "Frequent",
  pro: "Pro",
};

interface TierBadgeProps {
  tier: TierSlug;
  size?: "sm" | "lg";
}

export function TierBadge({ tier, size = "sm" }: TierBadgeProps) {
  const sizeClass = size === "lg" ? "text-sm px-3 py-1" : "text-xs px-2 py-0.5";

  return (
    <span
      className={`inline-flex items-center font-medium border rounded-sm ${sizeClass} ${TIER_STYLES[tier]}`}
    >
      {TIER_LABELS[tier]}
    </span>
  );
}
