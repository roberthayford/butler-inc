import { NextResponse } from "next/server";

/**
 * Production-safety guard for API routes that call the payment gateway.
 *
 * Returns `{ ok: true }` when `PAYMENT_GATEWAY` is "mock" or "stripe".
 * Returns `{ ok: false, response }` with a 500 JSON envelope otherwise;
 * caller should `return result.response` immediately.
 */
export function requireGatewayConfigured():
  | { ok: true }
  | { ok: false; response: NextResponse } {
  const provider = process.env.PAYMENT_GATEWAY;
  if (provider === "mock" || provider === "stripe") return { ok: true };
  return {
    ok: false,
    response: NextResponse.json(
      { error: { code: "gateway_unconfigured", message: "Payment gateway not configured" } },
      { status: 500 }
    ),
  };
}
