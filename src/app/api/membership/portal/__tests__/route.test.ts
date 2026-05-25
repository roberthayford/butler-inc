import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockCreatePortal, mockGetUser, mockSupabaseSelect } = vi.hoisted(() => ({
  mockCreatePortal: vi.fn(),
  mockGetUser: vi.fn(),
  mockSupabaseSelect: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: () => ({
      select: () => ({
        eq: () => ({
          in: () => ({
            order: () => ({
              limit: () => ({ maybeSingle: mockSupabaseSelect }),
            }),
          }),
        }),
      }),
    }),
  })),
}));

vi.mock("@/lib/payment/gateway", () => ({
  getPaymentGateway: () => ({ createPortalSession: mockCreatePortal }),
}));

import { POST } from "../route";

function req(body: unknown = {}, origin = "https://staging.butlersinc.com") {
  return new NextRequest(`${origin}/api/membership/portal`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

const originalEnv = process.env.PAYMENT_GATEWAY;

describe("POST /api/membership/portal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PAYMENT_GATEWAY = "mock";
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "u1@example.com" } } });
    mockSupabaseSelect.mockResolvedValue({
      data: {
        id: "m1",
        user_id: "u1",
        status: "active",
        stripe_subscription_id: "sub_1",
        stripe_customer_id: "cus_1",
      },
      error: null,
    });
    mockCreatePortal.mockResolvedValue({ url: "/payment/simulate-portal?customer_id=cus_1" });
  });

  afterEach(() => {
    if (originalEnv === undefined) delete process.env.PAYMENT_GATEWAY;
    else process.env.PAYMENT_GATEWAY = originalEnv;
  });

  it("returns 500 when PAYMENT_GATEWAY is unset", async () => {
    delete process.env.PAYMENT_GATEWAY;
    const res = await POST(req());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe("gateway_unconfigured");
  });

  it("returns 401 when not signed in", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(req());
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("unauthenticated");
  });

  it("returns 422 no_subscription when no membership row", async () => {
    mockSupabaseSelect.mockResolvedValue({ data: null, error: null });
    const res = await POST(req());
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe("no_subscription");
  });

  it("returns 422 no_subscription when stripe_subscription_id is null (admin-created row)", async () => {
    mockSupabaseSelect.mockResolvedValue({
      data: {
        id: "m1", user_id: "u1", status: "active",
        stripe_subscription_id: null, stripe_customer_id: null,
      },
      error: null,
    });
    const res = await POST(req());
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe("no_subscription");
  });

  it("returns 422 no_subscription for cancelled rows (defense in depth)", async () => {
    mockSupabaseSelect.mockResolvedValue({
      data: {
        id: "m1", user_id: "u1", status: "cancelled",
        stripe_subscription_id: "sub_1", stripe_customer_id: "cus_1",
      },
      error: null,
    });
    const res = await POST(req());
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe("no_subscription");
  });

  it("returns 422 no_customer when stripe_customer_id is null", async () => {
    mockSupabaseSelect.mockResolvedValue({
      data: {
        id: "m1", user_id: "u1", status: "active",
        stripe_subscription_id: "sub_1", stripe_customer_id: null,
      },
      error: null,
    });
    const res = await POST(req());
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe("no_customer");
  });

  it("returns 502 gateway_error when gateway throws", async () => {
    mockCreatePortal.mockRejectedValue(new Error("network down"));
    const res = await POST(req());
    expect(res.status).toBe(502);
    expect((await res.json()).error.code).toBe("gateway_error");
  });

  it("returns 503 gateway_not_implemented when gateway throws 'not yet implemented'", async () => {
    mockCreatePortal.mockRejectedValue(new Error("StripeGateway.createPortalSession() is not yet implemented"));
    const res = await POST(req());
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe("gateway_not_implemented");
  });

  it("returns 200 with the gateway URL on the happy path", async () => {
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: "/payment/simulate-portal?customer_id=cus_1" });
    expect(mockCreatePortal).toHaveBeenCalledWith(expect.objectContaining({
      customerId: "cus_1",
      returnUrl: expect.stringContaining("/members/settings"),
    }));
  });

  it("uses a custom returnUrl from the request body when provided", async () => {
    await POST(req({ returnUrl: "https://staging.butlersinc.com/members/dashboard" }));
    expect(mockCreatePortal).toHaveBeenCalledWith(expect.objectContaining({
      returnUrl: "https://staging.butlersinc.com/members/dashboard",
    }));
  });
});
