import type { createClient } from "@/lib/supabase/server";

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

/**
 * The Stripe customer id from the user's most recent membership row, if any.
 * Passed as `customerId` to subscription checkout so a re-subscribing member
 * reuses their existing Stripe customer instead of creating a duplicate.
 */
export async function getExistingStripeCustomerId(
  supabase: ServerSupabase,
  userId: string
): Promise<string | undefined> {
  const { data } = await supabase
    .from("memberships")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.stripe_customer_id ?? undefined;
}
