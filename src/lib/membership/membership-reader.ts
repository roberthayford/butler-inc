import type { SupabaseClient } from "@supabase/supabase-js";
import {
  hasPeriodExpired,
  resetUsageForNewPeriod,
} from "./period-rollover";

/**
 * Reads a user's membership row and, if its billing period has expired,
 * runs the UIOLO reset via the service-role client (bypassing RLS, since
 * the user-scoped UPDATE policy on `memberships` is admin-only).
 *
 * `isActive` is true only when the membership row exists, its status is
 * 'active', AND its billing period covers `today` after any reset.
 * Pricing logic should gate the member rate on `isActive`, not on the
 * row's `status` alone.
 *
 * Fails closed: any error during reset returns `isActive: false` (no
 * member pricing) while still returning the stale row for display.
 */
export async function readActiveMembership(
  userId: string | null | undefined,
  anonClient: SupabaseClient,
  serviceClient: SupabaseClient,
  today: string
): Promise<{
  membership: Record<string, unknown> | null;
  isActive: boolean;
}> {
  if (!userId) return { membership: null, isActive: false };

  const { data, error } = await anonClient
    .from("memberships")
    .select("*, membership_tiers(*)")
    .eq("user_id", userId)
    .in("status", ["active", "past_due"])
    .maybeSingle();

  if (error || !data) return { membership: null, isActive: false };

  const row = data as Record<string, unknown> & {
    id: string;
    status: string;
    personal_hours_used: number;
    virtual_tasks_used: number;
    billing_period_start: string;
    billing_period_end: string;
  };

  // past_due: return the row for dashboard display but never grant member
  // pricing — the customer's payment is failing and access is suspended.
  if (row.status === "past_due") {
    return { membership: row, isActive: false };
  }

  // Period covers today → no reset needed
  if (!hasPeriodExpired(row.billing_period_end, today)) {
    return { membership: row, isActive: true };
  }

  // Lazy reset via service client (bypasses RLS)
  const reset = resetUsageForNewPeriod(
    {
      personalHoursUsed: row.personal_hours_used,
      virtualTasksUsed: row.virtual_tasks_used,
      billingPeriodStart: row.billing_period_start,
      billingPeriodEnd: row.billing_period_end,
    },
    today
  );

  const { data: updated, error: updateError } = await serviceClient
    .from("memberships")
    .update({
      personal_hours_used: reset.personalHoursUsed,
      virtual_tasks_used: reset.virtualTasksUsed,
      billing_period_start: reset.billingPeriodStart,
      billing_period_end: reset.billingPeriodEnd,
    })
    // Optimistic lock: only update if billing_period_end hasn't moved
    // since we read it (defends against concurrent resets)
    .eq("id", row.id)
    .eq("billing_period_end", row.billing_period_end)
    .select("*, membership_tiers(*)")
    .maybeSingle();

  if (updateError || !updated) {
    // Failed write: return the stale row for display, but DO NOT grant
    // member benefits until the reset persists
    return { membership: row, isActive: false };
  }

  return { membership: updated as Record<string, unknown>, isActive: true };
}
