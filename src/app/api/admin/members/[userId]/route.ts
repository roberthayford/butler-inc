import { NextResponse, type NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !isAdmin(user.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId } = await params;
    const body = await request.json();
    const { tierSlug, personalHoursTotal, personalHoursUsed, virtualTasksTotal, virtualTasksUsed, billingPeriodStart, billingPeriodEnd, status } = body;

    const admin = createServiceClient();

    // Look up tier ID from slug
    const { data: tier, error: tierError } = await admin
      .from("membership_tiers")
      .select("id, personal_hours_included, virtual_tasks_included")
      .eq("slug", tierSlug)
      .single();

    if (tierError || !tier) {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
    }

    // Check if user already has an active membership
    const { data: existing } = await admin
      .from("memberships")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "active")
      .single();

    if (existing) {
      // Update existing membership
      const { data: updated, error: updateError } = await admin
        .from("memberships")
        .update({
          tier_id: tier.id,
          personal_hours_total: personalHoursTotal ?? tier.personal_hours_included,
          personal_hours_used: personalHoursUsed ?? 0,
          virtual_tasks_total: virtualTasksTotal ?? tier.virtual_tasks_included,
          virtual_tasks_used: virtualTasksUsed ?? 0,
          billing_period_start: billingPeriodStart,
          billing_period_end: billingPeriodEnd,
          status: status ?? "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select("*, membership_tiers(*)")
        .single();

      if (updateError) throw updateError;
      return NextResponse.json(updated);
    } else {
      // Create new membership
      const { data: created, error: createError } = await admin
        .from("memberships")
        .insert({
          user_id: userId,
          tier_id: tier.id,
          personal_hours_total: personalHoursTotal ?? tier.personal_hours_included,
          personal_hours_used: personalHoursUsed ?? 0,
          virtual_tasks_total: virtualTasksTotal ?? tier.virtual_tasks_included,
          virtual_tasks_used: virtualTasksUsed ?? 0,
          billing_period_start: billingPeriodStart,
          billing_period_end: billingPeriodEnd,
          status: status ?? "active",
        })
        .select("*, membership_tiers(*)")
        .single();

      if (createError) throw createError;
      return NextResponse.json(created);
    }
  } catch (error) {
    console.error("Admin member update failed:", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
