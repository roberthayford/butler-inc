import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Sign a mock webhook body with the shared MOCK_WEBHOOK_SECRET.
 *
 * Used by the dev-only simulate-portal page (server actions) when firing
 * synthetic webhook events at /api/webhooks/stripe. Real Stripe events use
 * Stripe's own signature scheme; this is the mock-mode equivalent.
 *
 * Throws if MOCK_WEBHOOK_SECRET is unset — we never want a silent fallback
 * to "unsigned" because the webhook route requires a valid signature.
 */
export function signMockWebhook(body: string): string {
  const secret = process.env.MOCK_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error(
      "MOCK_WEBHOOK_SECRET is required to sign mock webhook events. " +
        "Set it in .env.local for local dev and in Vercel env vars for Preview/Staging."
    );
  }
  return createHmac("sha256", secret).update(body).digest("hex");
}

/**
 * Verify a mock webhook signature in constant time. Returns false for any
 * mismatch (wrong body, wrong secret, missing/short signature, unset secret).
 *
 * Replaces the pre-fix accept-any-value `x-mock-signature: 1` gate.
 */
export function verifyMockWebhook(body: string, signature: string | null): boolean {
  if (!signature) return false;
  const secret = process.env.MOCK_WEBHOOK_SECRET;
  if (!secret) return false; // fail closed
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  // timingSafeEqual throws on unequal-length buffers — check length first.
  if (signature.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(signature, "utf8"), Buffer.from(expected, "utf8"));
}
