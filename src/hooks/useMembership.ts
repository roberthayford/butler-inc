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

export function useMembership() {
  const { user, supabase } = useAuth();

  const { data: membership = null, isLoading } = useQuery({
    queryKey: ["membership", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("memberships")
        .select("*, membership_tiers(*)")
        .eq("user_id", user!.id)
        .eq("status", "active")
        .single();

      if (error && error.code !== "PGRST116") throw error;
      if (!data) return null;
      return toMembership(data as MembershipRow);
    },
    enabled: !!user,
  });

  return {
    membership,
    isLoading,
    isMember: !!membership,
    personalHoursRemaining: membership
      ? membership.personalHoursTotal - membership.personalHoursUsed
      : 0,
    virtualTasksRemaining: membership
      ? membership.virtualTasksTotal - membership.virtualTasksUsed
      : 0,
  };
}
