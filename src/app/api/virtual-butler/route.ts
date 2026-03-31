import { NextResponse, type NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export function generateReference(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let ref = "VB-";
  for (let i = 0; i < 5; i++) {
    ref += chars[Math.floor(Math.random() * chars.length)];
  }
  return ref;
}

export async function POST(request: NextRequest) {
  try {
    // Auth via cookie-based session (same pattern as other routes)
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { category, description, preferredDate, preferredTime, membershipId } = body;

    if (!category || !description || !membershipId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const admin = createServiceClient();

    // Verify membership is active and belongs to user
    const { data: membership, error: memError } = await admin
      .from("memberships")
      .select("id, virtual_tasks_total, virtual_tasks_used")
      .eq("id", membershipId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (memError || !membership) {
      return NextResponse.json({ error: "Active membership required" }, { status: 403 });
    }

    // Check task allowance
    if (membership.virtual_tasks_used >= membership.virtual_tasks_total) {
      return NextResponse.json({ error: "No remaining virtual tasks" }, { status: 403 });
    }

    const reference = generateReference();

    // Insert request
    const { data: requestData, error: insertError } = await admin
      .from("virtual_butler_requests")
      .insert({
        user_id: user.id,
        membership_id: membershipId,
        reference,
        category,
        description,
        preferred_date: preferredDate || null,
        preferred_time: preferredTime || null,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Increment virtual_tasks_used
    const { error: updateError } = await admin
      .from("memberships")
      .update({
        virtual_tasks_used: membership.virtual_tasks_used + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", membershipId);

    if (updateError) throw updateError;

    return NextResponse.json({ reference, request: requestData });
  } catch (error) {
    console.error("Virtual butler request failed:", error);
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}
