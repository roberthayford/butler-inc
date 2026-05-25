"use server";

import { headers } from "next/headers";
import { signMockWebhook } from "@/lib/payment/mock-webhook-signature";

/**
 * Server action invoked when the user clicks "Approve subscription" on the
 * mock subscription checkout page. The synthetic `checkout.session.completed`
 * event is signed server-side (where MOCK_WEBHOOK_SECRET lives) and forwarded
 * to the webhook route, mirroring the simulate-portal page's pattern.
 *
 * Keeping the signing on the server means we never expose a sign-anything
 * endpoint that would itself defeat the gate.
 */
export async function approveSubscription(input: {
  sessionId: string;
  userId: string;
  priceId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const created = Math.floor(Date.now() / 1000);
  const thirtyDays = 30 * 24 * 60 * 60;

  const event = {
    type: "checkout.session.completed",
    created,
    data: {
      id: input.sessionId,
      client_reference_id: input.userId,
      customer: `mock_cus_${input.userId || "unknown"}`,
      subscription: `mock_sub_${input.userId || "unknown"}_${created}`,
      current_period_start: created,
      current_period_end: created + thirtyDays,
      line_items: [{ price: { id: input.priceId } }],
    },
  };

  const body = JSON.stringify(event);

  let signature: string;
  try {
    signature = signMockWebhook(body);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to sign webhook event",
    };
  }

  // Build origin from request headers. Default proto to "http" so local dev
  // (`npm run dev`) doesn't try to TLS-loopback into itself — Vercel sets
  // x-forwarded-proto to "https" explicitly when proxying production traffic.
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("host") ?? "localhost:3000";
  const origin = `${proto}://${host}`;

  try {
    const res = await fetch(`${origin}/api/webhooks/stripe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-mock-signature": signature,
      },
      body,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      // Webhook route's error envelope is { error: { code, message } } post-PR
      // #22, but tolerate the older flat-string shape too in case of any path
      // that hasn't been updated.
      const msg =
        typeof data.error === "string"
          ? data.error
          : (data.error?.message as string | undefined) ?? `Webhook returned ${res.status}`;
      return { ok: false, error: msg };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Webhook request failed",
    };
  }
}
