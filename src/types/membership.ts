export type TierSlug = "lite" | "frequent" | "pro";
export type MembershipStatus = "active" | "paused" | "cancelled" | "past_due";
export type VirtualTaskCategory = "appointment" | "taxi_airport" | "restaurant" | "other";
export type VirtualRequestStatus = "pending" | "in_progress" | "completed" | "cancelled";

export interface MembershipTier {
  id: string;
  slug: TierSlug;
  name: string;
  description: string;
  personalHoursIncluded: number;
  virtualTasksIncluded: number;
  monthlyPrice: number;
  displayOrder: number;
  isActive: boolean;
}

export interface Membership {
  id: string;
  userId: string;
  tierId: string;
  tier: MembershipTier;
  personalHoursTotal: number;
  personalHoursUsed: number;
  virtualTasksTotal: number;
  virtualTasksUsed: number;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  status: MembershipStatus;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  cancelAtPeriodEnd: boolean;
  pausedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VirtualButlerRequest {
  id: string;
  userId: string;
  membershipId: string;
  reference: string;
  category: VirtualTaskCategory;
  description: string;
  preferredDate: string | null;
  preferredTime: string | null;
  status: VirtualRequestStatus;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
}
