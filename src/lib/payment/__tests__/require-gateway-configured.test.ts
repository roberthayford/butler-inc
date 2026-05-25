import { afterEach, describe, expect, it } from "vitest";
import { NextResponse } from "next/server";
import { requireGatewayConfigured } from "../require-gateway-configured";

const originalEnv = process.env.PAYMENT_GATEWAY;

describe("requireGatewayConfigured", () => {
  afterEach(() => {
    if (originalEnv === undefined) delete process.env.PAYMENT_GATEWAY;
    else process.env.PAYMENT_GATEWAY = originalEnv;
  });

  it("returns ok=true when PAYMENT_GATEWAY=mock", () => {
    process.env.PAYMENT_GATEWAY = "mock";
    const result = requireGatewayConfigured();
    expect(result.ok).toBe(true);
  });

  it("returns ok=true when PAYMENT_GATEWAY=stripe", () => {
    process.env.PAYMENT_GATEWAY = "stripe";
    const result = requireGatewayConfigured();
    expect(result.ok).toBe(true);
  });

  it("returns a 500 NextResponse when PAYMENT_GATEWAY is unset", async () => {
    delete process.env.PAYMENT_GATEWAY;
    const result = requireGatewayConfigured();
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response).toBeInstanceOf(NextResponse);
    expect(result.response.status).toBe(500);
    const body = await result.response.json();
    expect(body).toEqual({
      error: { code: "gateway_unconfigured", message: "Payment gateway not configured" },
    });
  });

  it("returns a 500 NextResponse for unknown PAYMENT_GATEWAY values", () => {
    process.env.PAYMENT_GATEWAY = "paypal";
    const result = requireGatewayConfigured();
    expect(result.ok).toBe(false);
  });
});
