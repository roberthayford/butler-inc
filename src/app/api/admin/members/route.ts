import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !isAdmin(user.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const admin = createServiceClient();

    // Fetch all users
    const { data: authData, error: authError } = await admin.auth.admin.listUsers();
    if (authError) throw authError;

    // Fetch all memberships with tier info
    const { data: memberships, error: memError } = await admin
      .from("memberships")
      .select("*, membership_tiers(*)")
      .order("created_at", { ascending: false });
    if (memError) throw memError;

    // Join users with their memberships
    const membershipMap = new Map(
      (memberships ?? []).map((m: Record<string, unknown>) => [m.user_id, m])
    );

    const users = (authData.users ?? []).map((u) => ({
      id: u.id,
      email: u.email,
      name: u.user_metadata?.name ?? "",
      membership: membershipMap.get(u.id) ?? null,
    }));

    return NextResponse.json(users);
  } catch (error) {
    console.error("Admin members fetch failed:", error);
    return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
  }
}
