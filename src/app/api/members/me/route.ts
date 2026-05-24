import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { readActiveMembership } from "@/lib/membership/membership-reader";
import { todayUK } from "@/lib/dates/today-uk";

/**
 * Returns the authenticated user's membership row, lazy-resetting the
 * billing period via the service-role client if expired.
 *
 * The hook `useMembership` calls this so the RLS-restricted UPDATE can
 * happen server-side. Returns `{ membership: null, isActive: false }`
 * when unauthenticated or no membership row.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createServiceClient();
  const result = await readActiveMembership(
    user?.id ?? null,
    supabase,
    admin,
    todayUK()
  );

  return NextResponse.json(result);
}
