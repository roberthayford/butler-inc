import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const virtualButlerSchema = z.object({
  category: z.enum(["appointment", "taxi_airport", "restaurant", "other"]),
  description: z.string().min(1).max(1000),
  membershipId: z.string().uuid(),
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  preferredTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

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
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = virtualButlerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { category, description, membershipId, preferredDate, preferredTime } = parsed.data;
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

    // Atomic increment — the DB CHECK constraint (virtual_tasks_used <= virtual_tasks_total)
    // will reject the update if the user has no remaining tasks, preventing race conditions.
    const { error: updateError } = await admin
      .from("memberships")
      .update({
        virtual_tasks_used: membership.virtual_tasks_used + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", membershipId)
      .eq("virtual_tasks_used", membership.virtual_tasks_used); // Optimistic lock

    if (updateError) {
      // CHECK constraint violation or optimistic lock failure = no remaining tasks
      return NextResponse.json({ error: "No remaining virtual tasks" }, { status: 403 });
    }

    const reference = generateReference();

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

    return NextResponse.json({ reference, request: requestData });
  } catch (error) {
    console.error("Virtual butler request failed:", error);
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}
