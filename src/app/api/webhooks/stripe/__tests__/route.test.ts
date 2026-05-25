import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { signMockWebhook } from "@/lib/payment/mock-webhook-signature";

const { mockParse, mockHandlers } = vi.hoisted(() => {
  const mockParse = vi.fn();
  const mockHandlers = {
    handleCheckoutCompleted: vi.fn(),
    handleSubscriptionUpdated: vi.fn(),
    handleSubscriptionDeleted: vi.fn(),
    handleInvoicePaid: vi.fn(),
    handleInvoicePaymentFailed: vi.fn(),
  };
  return { mockParse, mockHandlers };
});

vi.mock("@/lib/payment/gateway", () => ({
  getPaymentGateway: () => ({ parseWebhookEvent: mockParse }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: () => ({ from: vi.fn() }),
}));
vi.mock("@/lib/payment/webhook-handler", () => mockHandlers);

import { POST } from "../route";

function webhookRequest(body: string, headers: Record<string, string> = {}) {
  return new NextRequest("https://example.com/api/webhooks/stripe", {
    method: "POST",
    body,
    headers: { "content-type": "application/json", ...headers },
  });
}

function mockSigned(body: string, headers: Record<string, string> = {}) {
  return webhookRequest(body, { "x-mock-signature": signMockWebhook(body), ...headers });
}

const ORIGINAL_MOCK_SECRET = process.env.MOCK_WEBHOOK_SECRET;

describe("POST /api/webhooks/stripe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.PAYMENT_GATEWAY;
    process.env.MOCK_WEBHOOK_SECRET = "test-secret-for-mock-mode";
  });

  afterEach(() => {
    if (ORIGINAL_MOCK_SECRET === undefined) delete process.env.MOCK_WEBHOOK_SECRET;
    else process.env.MOCK_WEBHOOK_SECRET = ORIGINAL_MOCK_SECRET;
  });

  it("in mock mode, accepts a body signed with a valid HMAC and dispatches", async () => {
    process.env.PAYMENT_GATEWAY = "mock";
    mockParse.mockResolvedValue({ type: "checkout.session.completed", created: 1, data: {} });
    const res = await POST(mockSigned('{"type":"checkout.session.completed"}'));
    expect(res.status).toBe(200);
    expect(mockHandlers.handleCheckoutCompleted).toHaveBeenCalled();
  });

  it("(security fix) in mock mode, REJECTS the literal 'x-mock-signature: 1' (closes accept-any-value gate)", async () => {
    process.env.PAYMENT_GATEWAY = "mock";
    const res = await POST(webhookRequest('{"type":"checkout.session.completed"}', { "x-mock-signature": "1" }));
    expect(res.status).toBe(400);
    expect(mockParse).not.toHaveBeenCalled();
  });

  it("(security fix) in mock mode, rejects an HMAC computed for a DIFFERENT body (no replay across payloads)", async () => {
    process.env.PAYMENT_GATEWAY = "mock";
    const sig = signMockWebhook('{"type":"customer.subscription.deleted"}');
    const res = await POST(webhookRequest('{"type":"customer.subscription.updated"}', { "x-mock-signature": sig }));
    expect(res.status).toBe(400);
    expect(mockParse).not.toHaveBeenCalled();
  });

  it("(security fix) in mock mode, rejects valid HMAC when MOCK_WEBHOOK_SECRET is unset (fail closed)", async () => {
    process.env.PAYMENT_GATEWAY = "mock";
    const sig = signMockWebhook('{"type":"checkout.session.completed"}');
    delete process.env.MOCK_WEBHOOK_SECRET;
    const res = await POST(webhookRequest('{"type":"checkout.session.completed"}', { "x-mock-signature": sig }));
    expect(res.status).toBe(400);
  });

  it("in stripe mode, rejects requests missing stripe-signature with 400", async () => {
    process.env.PAYMENT_GATEWAY = "stripe";
    const res = await POST(webhookRequest('{"type":"checkout.session.completed"}'));
    expect(res.status).toBe(400);
    expect(mockParse).not.toHaveBeenCalled();
  });

  it("returns 200 for unhandled event types without calling any handler", async () => {
    process.env.PAYMENT_GATEWAY = "mock";
    mockParse.mockResolvedValue({ type: "unhandled", created: 1, rawType: "customer.created" });
    const res = await POST(mockSigned('{"type":"customer.created"}'));
    expect(res.status).toBe(200);
    expect(mockHandlers.handleCheckoutCompleted).not.toHaveBeenCalled();
  });

  it("returns 400 when gateway.parseWebhookEvent throws (invalid sig)", async () => {
    process.env.PAYMENT_GATEWAY = "mock";
    mockParse.mockRejectedValue(new Error("invalid signature"));
    const res = await POST(mockSigned('{}'));
    expect(res.status).toBe(400);
  });

  it("returns 500 when PAYMENT_GATEWAY is unset (production misconfiguration)", async () => {
    // PAYMENT_GATEWAY already deleted in beforeEach
    const res = await POST(mockSigned('{"type":"checkout.session.completed"}'));
    expect(res.status).toBe(500);
    expect(mockParse).not.toHaveBeenCalled();
  });

  it("returns 500 when PAYMENT_GATEWAY is an unknown value", async () => {
    process.env.PAYMENT_GATEWAY = "paypal";
    const res = await POST(mockSigned('{"type":"checkout.session.completed"}'));
    expect(res.status).toBe(500);
  });

  it("in mock mode, rejects stripe-signature without x-mock-signature (no spoofing)", async () => {
    process.env.PAYMENT_GATEWAY = "mock";
    const res = await POST(webhookRequest('{"type":"checkout.session.completed"}', { "stripe-signature": "t=123,v1=fake" }));
    expect(res.status).toBe(400);
    expect(mockParse).not.toHaveBeenCalled();
  });

  it("returns 400 'invalid body' on JSON.parse failures (distinguishable from signature failures)", async () => {
    process.env.PAYMENT_GATEWAY = "mock";
    mockParse.mockRejectedValue(new SyntaxError("Unexpected token"));
    const res = await POST(mockSigned('not json'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid body");
  });

  it("returns 503 when gateway throws not-yet-implemented (Stripe will retry, not drop)", async () => {
    process.env.PAYMENT_GATEWAY = "stripe";
    mockParse.mockRejectedValue(new Error("StripeGateway.parseWebhookEvent() is not yet implemented. Wire @stripe/stripe-node in a focused PR."));
    const res = await POST(webhookRequest('{}', { "stripe-signature": "t=123,v1=fake" }));
    expect(res.status).toBe(503);
  });
});
