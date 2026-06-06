import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockCreateSub, mockGetUser, mockMaybeSingle } = vi.hoisted(() => ({
  mockCreateSub: vi.fn(),
  mockGetUser: vi.fn(),
  mockMaybeSingle: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => ({ maybeSingle: mockMaybeSingle }),
          }),
        }),
      }),
    }),
  })),
}));
vi.mock("@/lib/payment/gateway", () => ({
  getPaymentGateway: () => ({ createSubscriptionCheckoutSession: mockCreateSub }),
}));

import { POST } from "../route";

function req(body: unknown) {
  return new NextRequest("https://staging.butlersinc.com/api/membership/checkout", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/membership/checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "u1@example.com" } } });
    mockCreateSub.mockResolvedValue({ url: "https://stripe.test/checkout/sess_1", sessionId: "sess_1" });
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
  });

  it("returns 401 when no auth session", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(req({ tier: "lite" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for an invalid tier slug", async () => {
    const res = await POST(req({ tier: "ultra" }));
    expect(res.status).toBe(400);
    expect(mockCreateSub).not.toHaveBeenCalled();
  });

  it("calls gateway with tier + priceId + userId + origin-derived URLs and returns the gateway URL", async () => {
    const res = await POST(req({ tier: "frequent" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ url: "https://stripe.test/checkout/sess_1" });
    expect(mockCreateSub).toHaveBeenCalledWith(expect.objectContaining({
      tier: "frequent",
      priceId: "mock_frequent",
      userId: "u1",
      customerEmail: "u1@example.com",
      successUrl: "https://staging.butlersinc.com/members/checkout/success?session_id={CHECKOUT_SESSION_ID}",
      cancelUrl: "https://staging.butlersinc.com/membership",
    }));
  });

  it("passes the existing stripe customer id for a re-subscribing member", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { stripe_customer_id: "cus_existing" },
      error: null,
    });
    await POST(req({ tier: "lite" }));
    expect(mockCreateSub).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: "cus_existing" })
    );
  });
});
