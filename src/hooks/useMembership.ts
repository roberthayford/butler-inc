import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import type { Membership, MembershipTier } from "@/types/membership";

interface MembershipRow {
  id: string;
  user_id: string;
  tier_id: string;
  personal_hours_total: number;
  personal_hours_used: number;
  virtual_tasks_total: number;
  virtual_tasks_used: number;
  billing_period_start: string;
  billing_period_end: string;
  status: string;
  created_at: string;
  updated_at: string;
  membership_tiers: {
    id: string;
    slug: string;
    name: string;
    description: string;
    personal_hours_included: number;
    virtual_tasks_included: number;
    monthly_price: number;
    display_order: number;
    is_active: boolean;
  };
}

interface MembershipApiResponse {
  membership: MembershipRow | null;
  isActive: boolean;
}

function toMembership(row: MembershipRow): Membership {
  return {
    id: row.id,
    userId: row.user_id,
    tierId: row.tier_id,
    tier: {
      id: row.membership_tiers.id,
      slug: row.membership_tiers.slug as MembershipTier["slug"],
      name: row.membership_tiers.name,
      description: row.membership_tiers.description,
      personalHoursIncluded: row.membership_tiers.personal_hours_included,
      virtualTasksIncluded: row.membership_tiers.virtual_tasks_included,
      monthlyPrice: row.membership_tiers.monthly_price,
      displayOrder: row.membership_tiers.display_order,
      isActive: row.membership_tiers.is_active,
    },
    personalHoursTotal: row.personal_hours_total,
    personalHoursUsed: row.personal_hours_used,
    virtualTasksTotal: row.virtual_tasks_total,
    virtualTasksUsed: row.virtual_tasks_used,
    billingPeriodStart: row.billing_period_start,
    billingPeriodEnd: row.billing_period_end,
    status: row.status as Membership["status"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Fetches the authenticated user's membership through the server endpoint
 * `/api/members/me`. The endpoint reads the row and lazy-resets the
 * billing period via the service-role client when expired — this is
 * necessary because the RLS UPDATE policy on `memberships` is admin-only,
 * so the previous in-hook write was silently no-opping.
 */
export function useMembership() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery<MembershipApiResponse>({
    queryKey: ["membership", user?.id],
    queryFn: async () => {
      const res = await fetch("/api/members/me", {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Membership fetch failed: ${res.status}`);
      return (await res.json()) as MembershipApiResponse;
    },
    enabled: !!user,
  });

  const row = data?.membership ?? null;
  const membership = row ? toMembership(row) : null;

  return {
    membership,
    isLoading,
    // `isMember` reflects the server's view of "active right now" —
    // status='active' AND billing period covers today. A lapsed-period
    // member is reported as not active, so member pricing won't apply
    // until their reset persists.
    isMember: data?.isActive ?? false,
    personalHoursRemaining: membership
      ? membership.personalHoursTotal - membership.personalHoursUsed
      : 0,
    virtualTasksRemaining: membership
      ? membership.virtualTasksTotal - membership.virtualTasksUsed
      : 0,
  };
}
