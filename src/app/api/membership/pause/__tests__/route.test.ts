import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  mockPauseSub, mockResumeSub, mockGetUser,
  mockSupabaseSelect, mockSupabaseUpdate,
} = vi.hoisted(() => ({
  mockPauseSub: vi.fn(),
  mockResumeSub: vi.fn(),
  mockGetUser: vi.fn(),
  mockSupabaseSelect: vi.fn(),
  mockSupabaseUpdate: vi.fn(),
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
      update: (patch: unknown) => ({
        eq: () => ({
          eq: () => ({
            select: () => ({ maybeSingle: () => mockSupabaseUpdate(patch) }),
          }),
        }),
      }),
    }),
  })),
}));

vi.mock("@/lib/payment/gateway", () => ({
  getPaymentGateway: () => ({
    pauseSubscription: mockPauseSub,
    resumeSubscription: mockResumeSub,
  }),
}));

import { POST } from "../route";

function req(body: unknown) {
  return new NextRequest("https://staging.butlersinc.com/api/membership/pause", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

const originalEnv = process.env.PAYMENT_GATEWAY;

describe("POST /api/membership/pause — pause", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PAYMENT_GATEWAY = "mock";
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockSupabaseSelect.mockResolvedValue({
      data: {
        id: "m1", user_id: "u1", status: "active",
        stripe_subscription_id: "sub_1", cancel_at_period_end: false,
      },
      error: null,
    });
    mockSupabaseUpdate.mockResolvedValue({
      data: { id: "m1", status: "paused", paused_at: "2026-05-24T12:00:00.000Z" },
      error: null,
    });
    mockPauseSub.mockResolvedValue(undefined);
    mockResumeSub.mockResolvedValue(undefined);
  });

  afterEach(() => {
    if (originalEnv === undefined) delete process.env.PAYMENT_GATEWAY;
    else process.env.PAYMENT_GATEWAY = originalEnv;
  });

  it("returns 500 when PAYMENT_GATEWAY is unset", async () => {
    delete process.env.PAYMENT_GATEWAY;
    const res = await POST(req({ action: "pause" }));
    expect(res.status).toBe(500);
  });

  it("returns 401 when not signed in", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(req({ action: "pause" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid body shape", async () => {
    const res = await POST(req({ action: "explode" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("invalid_body");
  });

  it("returns 422 no_subscription for admin-created rows (sub_id null)", async () => {
    mockSupabaseSelect.mockResolvedValue({
      data: {
        id: "m1", user_id: "u1", status: "active",
        stripe_subscription_id: null, cancel_at_period_end: false,
      },
      error: null,
    });
    const res = await POST(req({ action: "pause" }));
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe("no_subscription");
  });

  it("returns 409 invalid_transition when pausing an already-paused row", async () => {
    mockSupabaseSelect.mockResolvedValue({
      data: {
        id: "m1", user_id: "u1", status: "paused",
        stripe_subscription_id: "sub_1", cancel_at_period_end: false,
      },
      error: null,
    });
    const res = await POST(req({ action: "pause" }));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.code).toBe("invalid_transition");
    expect(body.error.data).toMatchObject({ from: "paused", action: "pause" });
  });

  it("returns 409 invalid_transition when pausing past_due", async () => {
    mockSupabaseSelect.mockResolvedValue({
      data: {
        id: "m1", user_id: "u1", status: "past_due",
        stripe_subscription_id: "sub_1", cancel_at_period_end: false,
      },
      error: null,
    });
    const res = await POST(req({ action: "pause" }));
    expect(res.status).toBe(409);
  });

  it("returns 409 invalid_transition when pausing a sub with cancel_at_period_end=true", async () => {
    mockSupabaseSelect.mockResolvedValue({
      data: {
        id: "m1", user_id: "u1", status: "active",
        stripe_subscription_id: "sub_1", cancel_at_period_end: true,
      },
      error: null,
    });
    const res = await POST(req({ action: "pause" }));
    expect(res.status).toBe(409);
  });

  it("returns 502 gateway_error when gateway throws (DB unchanged)", async () => {
    mockPauseSub.mockRejectedValue(new Error("network down"));
    const res = await POST(req({ action: "pause" }));
    expect(res.status).toBe(502);
    expect(mockSupabaseUpdate).not.toHaveBeenCalled();
  });

  it("returns 409 when the conditional UPDATE returns no rows (race condition)", async () => {
    mockSupabaseUpdate.mockResolvedValue({ data: null, error: null });
    const res = await POST(req({ action: "pause" }));
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("invalid_transition");
  });

  it("returns 200 { status: 'paused' } on the happy path; gateway called then DB updated", async () => {
    const res = await POST(req({ action: "pause" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "paused" });
    expect(mockPauseSub).toHaveBeenCalledWith("sub_1");
    expect(mockSupabaseUpdate).toHaveBeenCalledWith(expect.objectContaining({
      status: "paused",
      paused_at: expect.any(String),
    }));
  });
});

describe("POST /api/membership/pause — resume", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PAYMENT_GATEWAY = "mock";
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockPauseSub.mockResolvedValue(undefined);
    mockResumeSub.mockResolvedValue(undefined);
  });

  afterEach(() => {
    if (originalEnv === undefined) delete process.env.PAYMENT_GATEWAY;
    else process.env.PAYMENT_GATEWAY = originalEnv;
  });

  it("returns 409 invalid_transition when resuming an active row", async () => {
    mockSupabaseSelect.mockResolvedValue({
      data: {
        id: "m1", user_id: "u1", status: "active",
        stripe_subscription_id: "sub_1", cancel_at_period_end: false,
      },
      error: null,
    });
    const res = await POST(req({ action: "resume" }));
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("invalid_transition");
  });

  it("returns 409 invalid_transition when resuming a cancelled row", async () => {
    mockSupabaseSelect.mockResolvedValue({
      data: {
        id: "m1", user_id: "u1", status: "cancelled",
        stripe_subscription_id: "sub_1", cancel_at_period_end: false,
      },
      error: null,
    });
    const res = await POST(req({ action: "resume" }));
    expect(res.status).toBe(409);
  });

  it("returns 200 { status: 'active' } when resuming a paused row; gateway called then DB updated", async () => {
    mockSupabaseSelect.mockResolvedValue({
      data: {
        id: "m1", user_id: "u1", status: "paused",
        stripe_subscription_id: "sub_1", cancel_at_period_end: false,
      },
      error: null,
    });
    mockSupabaseUpdate.mockResolvedValue({
      data: { id: "m1", status: "active", paused_at: null },
      error: null,
    });
    const res = await POST(req({ action: "resume" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "active" });
    expect(mockResumeSub).toHaveBeenCalledWith("sub_1");
    expect(mockSupabaseUpdate).toHaveBeenCalledWith(expect.objectContaining({
      status: "active",
      paused_at: null,
    }));
  });

  it("returns 502 gateway_error on resume gateway failure (DB unchanged)", async () => {
    mockSupabaseSelect.mockResolvedValue({
      data: {
        id: "m1", user_id: "u1", status: "paused",
        stripe_subscription_id: "sub_1", cancel_at_period_end: false,
      },
      error: null,
    });
    mockResumeSub.mockRejectedValue(new Error("network"));
    const res = await POST(req({ action: "resume" }));
    expect(res.status).toBe(502);
    expect(mockSupabaseUpdate).not.toHaveBeenCalled();
  });
});
