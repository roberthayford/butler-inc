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
  | { kind: "activated"; tierSlug: TierSlug; hoursTotal: number; tasksTotal: number; renewsAt: string; monthlyPrice: number }
  | { kind: "renewed"; tierSlug: TierSlug; periodEnd: string; monthlyPrice: number }
  | { kind: "payment_failed"; tierSlug: TierSlug }
  | { kind: "paused"; tierSlug: TierSlug; pausedAt: string }
  | { kind: "resumed"; tierSlug: TierSlug }
  | { kind: "cancel_scheduled"; tierSlug: TierSlug; endsAt: string }
  | { kind: "cancel_reversed"; tierSlug: TierSlug }
  | { kind: "cancelled"; tierSlug: TierSlug; endedAt: string }
  | { kind: "plan_changed"; fromTierSlug: TierSlug; toTierSlug: TierSlug; newHoursTotal: number; renewsAt: string }
  | { kind: "noop" };

export interface DetectArgs {
  event: WebhookEvent;
  priorRow: MembershipRow | null;
  updatedRow: MembershipRow;
  /**
   * Resolves a `tier_id` to its slug. Return `null` when the tier cannot be
   * resolved (e.g. admin-created row with `tier_id = null`, or a tier deleted
   * from `membership_tiers`). When `null` is returned for a transition that
   * needs a tier name in its email, `detectTransition` returns `{ kind: "noop" }`
   * rather than silently labelling the membership as "Lite" — a wrong tier
   * name in a customer-facing email is worse than no email.
   */
  tierSlugLookup: (tierId: string | null) => TierSlug | null;
}

function eventTimeIso(event: WebhookEvent): string {
  return new Date(event.created * 1000).toISOString();
}

export function detectTransition({ event, priorRow, updatedRow, tierSlugLookup }: DetectArgs): Transition {
  const tierSlug = tierSlugLookup(updatedRow.tier_id);

  switch (event.type) {
    case "checkout.session.completed": {
      if (!tierSlug) return { kind: "noop" };
      const wasUnattached = priorRow !== null && priorRow.stripe_subscription_id === null;
      if (priorRow === null || wasUnattached) {
        const activatedTier = MEMBERSHIP_TIERS.find((t) => t.slug === tierSlug);
        return {
          kind: "activated",
          tierSlug,
          hoursTotal: updatedRow.personal_hours_total,
          tasksTotal: updatedRow.virtual_tasks_total,
          renewsAt: updatedRow.billing_period_end,
          // First-payment amount so the Welcome email doubles as the initial
          // receipt (the first invoice.paid is a noop — same billing period).
          monthlyPrice: activatedTier?.monthlyPrice ?? 0,
        };
      }
      return { kind: "noop" };
    }

    case "customer.subscription.updated": {
      if (!priorRow) return { kind: "noop" };
      if (!tierSlug) return { kind: "noop" };
      // Priority order: paused > resumed > cancel_scheduled > cancel_reversed > plan_changed
      if (priorRow.status !== "paused" && updatedRow.status === "paused") {
        return { kind: "paused", tierSlug, pausedAt: eventTimeIso(event) };
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
        if (!fromTierSlug) return { kind: "noop" };
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
      if (!tierSlug) return { kind: "noop" };
      return { kind: "cancelled", tierSlug, endedAt: eventTimeIso(event) };

    case "invoice.paid": {
      if (!priorRow) return { kind: "noop" };
      if (!tierSlug) return { kind: "noop" };
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
      if (!tierSlug) return { kind: "noop" };
      if (priorRow?.status === "past_due") return { kind: "noop" };
      return { kind: "payment_failed", tierSlug };
    }

    case "unhandled":
      return { kind: "noop" };
  }
}
