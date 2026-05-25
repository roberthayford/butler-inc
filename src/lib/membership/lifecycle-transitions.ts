import type { WebhookEvent } from "@/lib/payment/types";
import { MEMBERSHIP_TIERS } from "@/data/membership-config";
import type { TierSlug } from "@/types/membership";

export type MembershipRow = {
  id: string;
  user_id: string;
  status: string;
  tier_id: string | null;
  cancel_at_period_end: boolean;
  billing_period_end: string;
  stripe_subscription_id: string | null;
  updated_at: string;
  personal_hours_total: number;
  virtual_tasks_total: number;
};

export type Transition =
  | { kind: "activated"; tierSlug: TierSlug; hoursTotal: number; tasksTotal: number; renewsAt: string }
  | { kind: "renewed"; tierSlug: TierSlug; periodEnd: string; monthlyPrice: number }
  | { kind: "payment_failed"; tierSlug: TierSlug }
  | { kind: "paused"; tierSlug: TierSlug }
  | { kind: "resumed"; tierSlug: TierSlug }
  | { kind: "cancel_scheduled"; tierSlug: TierSlug; endsAt: string }
  | { kind: "cancel_reversed"; tierSlug: TierSlug }
  | { kind: "cancelled"; tierSlug: TierSlug }
  | { kind: "plan_changed"; fromTierSlug: TierSlug; toTierSlug: TierSlug; newHoursTotal: number; renewsAt: string }
  | { kind: "noop" };

export interface DetectArgs {
  event: WebhookEvent;
  priorRow: MembershipRow | null;
  updatedRow: MembershipRow;
  tierSlugLookup: (tierId: string | null) => TierSlug;
}

export function detectTransition({ event, priorRow, updatedRow, tierSlugLookup }: DetectArgs): Transition {
  const tierSlug = tierSlugLookup(updatedRow.tier_id);

  switch (event.type) {
    case "checkout.session.completed": {
      // Fresh insert (no prior row) OR admin-overlap upgrade (prior had no sub_id)
      const wasUnattached = priorRow !== null && priorRow.stripe_subscription_id === null;
      if (priorRow === null || wasUnattached) {
        return {
          kind: "activated",
          tierSlug,
          hoursTotal: updatedRow.personal_hours_total,
          tasksTotal: updatedRow.virtual_tasks_total,
          renewsAt: updatedRow.billing_period_end,
        };
      }
      return { kind: "noop" };
    }

    case "customer.subscription.updated": {
      if (!priorRow) return { kind: "noop" };
      // Priority order: paused > resumed > cancel_scheduled > cancel_reversed > plan_changed
      if (priorRow.status !== "paused" && updatedRow.status === "paused") {
        return { kind: "paused", tierSlug };
      }
      if (priorRow.status === "paused" && updatedRow.status !== "paused") {
        return { kind: "resumed", tierSlug };
      }
      if (!priorRow.cancel_at_period_end && updatedRow.cancel_at_period_end) {
        return { kind: "cancel_scheduled", tierSlug, endsAt: updatedRow.billing_period_end };
      }
      if (priorRow.cancel_at_period_end && !updatedRow.cancel_at_period_end) {
        return { kind: "cancel_reversed", tierSlug };
      }
      if (priorRow.tier_id !== updatedRow.tier_id) {
        const fromTierSlug = tierSlugLookup(priorRow.tier_id);
        return {
          kind: "plan_changed",
          fromTierSlug,
          toTierSlug: tierSlug,
          newHoursTotal: updatedRow.personal_hours_total,
          renewsAt: updatedRow.billing_period_end,
        };
      }
      return { kind: "noop" };
    }

    case "customer.subscription.deleted":
      return { kind: "cancelled", tierSlug };

    case "invoice.paid": {
      if (!priorRow) return { kind: "noop" };
      if (priorRow.billing_period_end === updatedRow.billing_period_end) return { kind: "noop" };
      const tier = MEMBERSHIP_TIERS.find((t) => t.slug === tierSlug);
      return {
        kind: "renewed",
        tierSlug,
        periodEnd: updatedRow.billing_period_end,
        monthlyPrice: tier?.monthlyPrice ?? 0,
      };
    }

    case "invoice.payment_failed": {
      if (priorRow?.status === "past_due") return { kind: "noop" };
      return { kind: "payment_failed", tierSlug };
    }

    case "unhandled":
      return { kind: "noop" };
  }
}
