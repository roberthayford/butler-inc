import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { signMockWebhook } from "@/lib/payment/mock-webhook-signature";

export const dynamic = "force-dynamic";

async function getOrigin(): Promise<string> {
  const h = await headers();
  // Default to "http" so local dev (npm run dev, no proxy) doesn't TLS-loopback
  // into itself. Vercel sets x-forwarded-proto explicitly when proxying.
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

async function fireWebhook(body: object): Promise<void> {
  const origin = await getOrigin();
  const json = JSON.stringify(body);
  // signMockWebhook throws if MOCK_WEBHOOK_SECRET is unset — fail fast so the
  // simulator never silently sends an unsigned event the webhook route would reject.
  const signature = signMockWebhook(json);
  await fetch(`${origin}/api/webhooks/stripe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-mock-signature": signature,
    },
    body: json,
  });
}

async function cancelAction(formData: FormData): Promise<void> {
  "use server";
  const subId = formData.get("sub_id") as string;
  const customerId = formData.get("customer_id") as string;
  const now = Math.floor(Date.now() / 1000);
  await fireWebhook({
    type: "customer.subscription.updated",
    created: now,
    data: {
      id: subId,
      customer: customerId,
      status: "active",
      cancel_at_period_end: true,
      current_period_start: now,
      current_period_end: now + 30 * 24 * 3600,
      pause_collection: null,
      items: { data: [] },
    },
  });
  redirect("/members/settings");
}

async function changePlanAction(formData: FormData): Promise<void> {
  "use server";
  const subId = formData.get("sub_id") as string;
  const customerId = formData.get("customer_id") as string;
  const priceId = formData.get("price_id") as string;
  const now = Math.floor(Date.now() / 1000);
  await fireWebhook({
    type: "customer.subscription.updated",
    created: now,
    data: {
      id: subId,
      customer: customerId,
      status: "active",
      cancel_at_period_end: false,
      current_period_start: now,
      current_period_end: now + 30 * 24 * 3600,
      pause_collection: null,
      items: { data: [{ price: { id: priceId } }] },
    },
  });
  redirect("/members/settings");
}

async function reactivateAction(formData: FormData): Promise<void> {
  "use server";
  const subId = formData.get("sub_id") as string;
  const customerId = formData.get("customer_id") as string;
  const now = Math.floor(Date.now() / 1000);
  await fireWebhook({
    type: "customer.subscription.updated",
    created: now,
    data: {
      id: subId,
      customer: customerId,
      status: "active",
      cancel_at_period_end: false,
      current_period_start: now,
      current_period_end: now + 30 * 24 * 3600,
      pause_collection: null,
      items: { data: [] },
    },
  });
  redirect("/members/settings");
}

async function updateCardFailAction(formData: FormData): Promise<void> {
  "use server";
  const subId = formData.get("sub_id") as string;
  const customerId = formData.get("customer_id") as string;
  const now = Math.floor(Date.now() / 1000);
  await fireWebhook({
    type: "invoice.payment_failed",
    created: now,
    data: {
      id: `in_mock_${now}`,
      customer: customerId,
      subscription: subId,
      period_start: now,
      period_end: now + 30 * 24 * 3600,
      status: "open",
    },
  });
  redirect("/members/settings");
}

async function triggerInvoicePaidAction(formData: FormData): Promise<void> {
  "use server";
  const subId = formData.get("sub_id") as string;
  const customerId = formData.get("customer_id") as string;
  const now = Math.floor(Date.now() / 1000);
  await fireWebhook({
    type: "invoice.paid",
    created: now,
    data: {
      id: `in_mock_${now}`,
      customer: customerId,
      subscription: subId,
      period_start: now,
      period_end: now + 30 * 24 * 3600,
      status: "paid",
    },
  });
  redirect("/members/settings");
}

interface PageProps {
  searchParams: Promise<{ customer_id?: string }>;
}

const BUTTON_CLASS =
  "w-full text-left bg-primary-foreground/5 border border-primary-foreground/10 hover:border-brass/40 rounded-sm p-3";

export default async function SimulatePortalPage({ searchParams }: PageProps) {
  // Production safety: page is only reachable in mock mode.
  if (process.env.NODE_ENV === "production" && process.env.PAYMENT_GATEWAY !== "mock") {
    notFound();
  }

  const params = await searchParams;
  const customerId = params.customer_id;
  if (!customerId) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  // Use the service client to read the membership regardless of RLS scope
  // (the row belongs to the signed-in user, so this is safe).
  const admin = createServiceClient();
  const { data: row } = await admin
    .from("memberships")
    .select("stripe_subscription_id, status, cancel_at_period_end")
    .eq("user_id", user.id)
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (!row || !row.stripe_subscription_id) notFound();

  const subId = row.stripe_subscription_id;
  const cancelScheduled = row.cancel_at_period_end === true;

  return (
    <div className="min-h-screen bg-charcoal text-optical-white p-12">
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-serif mb-2">Mock Customer Portal (dev only)</h1>
        <p className="text-warm-gray text-sm mb-6">
          Customer: {customerId} &middot; Subscription: {subId} &middot; Status: {row.status}
          {cancelScheduled ? " (cancel scheduled)" : ""}
        </p>

        <div className="space-y-3">
          {row.status === "active" && !cancelScheduled && (
            <form action={cancelAction}>
              <input type="hidden" name="sub_id" value={subId} />
              <input type="hidden" name="customer_id" value={customerId} />
              <button className={BUTTON_CLASS} type="submit">Cancel subscription</button>
            </form>
          )}

          {row.status === "active" && (
            <>
              <form action={changePlanAction}>
                <input type="hidden" name="sub_id" value={subId} />
                <input type="hidden" name="customer_id" value={customerId} />
                <input type="hidden" name="price_id" value="mock_frequent" />
                <button className={BUTTON_CLASS} type="submit">Change to Frequent</button>
              </form>
              <form action={changePlanAction}>
                <input type="hidden" name="sub_id" value={subId} />
                <input type="hidden" name="customer_id" value={customerId} />
                <input type="hidden" name="price_id" value="mock_pro" />
                <button className={BUTTON_CLASS} type="submit">Change to Pro</button>
              </form>
            </>
          )}

          {cancelScheduled && (
            <form action={reactivateAction}>
              <input type="hidden" name="sub_id" value={subId} />
              <input type="hidden" name="customer_id" value={customerId} />
              <button className={BUTTON_CLASS} type="submit">Reactivate subscription</button>
            </form>
          )}

          <form action={updateCardFailAction}>
            <input type="hidden" name="sub_id" value={subId} />
            <input type="hidden" name="customer_id" value={customerId} />
            <button className={BUTTON_CLASS} type="submit">Update card (simulate decline)</button>
          </form>

          {row.status === "past_due" && (
            <form action={triggerInvoicePaidAction}>
              <input type="hidden" name="sub_id" value={subId} />
              <input type="hidden" name="customer_id" value={customerId} />
              <button className={BUTTON_CLASS} type="submit">
                Trigger invoice.paid (recover from past_due)
              </button>
            </form>
          )}
        </div>

        <a
          href="/members/settings"
          className="mt-8 inline-block text-warm-gray text-sm hover:text-optical-white"
        >
          &larr; Back to settings
        </a>
      </div>
    </div>
  );
}
