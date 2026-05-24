import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

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

describe("POST /api/webhooks/stripe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.PAYMENT_GATEWAY;
  });

  it("in mock mode, accepts an unsigned body with x-mock-signature header and dispatches", async () => {
    process.env.PAYMENT_GATEWAY = "mock";
    mockParse.mockResolvedValue({ type: "checkout.session.completed", created: 1, data: {} });
    const res = await POST(webhookRequest('{"type":"checkout.session.completed"}', { "x-mock-signature": "1" }));
    expect(res.status).toBe(200);
    expect(mockHandlers.handleCheckoutCompleted).toHaveBeenCalled();
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
    const res = await POST(webhookRequest('{"type":"customer.created"}', { "x-mock-signature": "1" }));
    expect(res.status).toBe(200);
    expect(mockHandlers.handleCheckoutCompleted).not.toHaveBeenCalled();
  });

  it("returns 400 when gateway.parseWebhookEvent throws (invalid sig)", async () => {
    process.env.PAYMENT_GATEWAY = "mock";
    mockParse.mockRejectedValue(new Error("invalid signature"));
    const res = await POST(webhookRequest('{}', { "x-mock-signature": "1" }));
    expect(res.status).toBe(400);
  });
});
