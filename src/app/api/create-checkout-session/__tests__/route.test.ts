import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  mockGetUser,
  mockReadActiveMembership,
  mockCreateCheckoutSession,
  mockInsertBooking,
  mockUpdateCheckoutSession,
  mockConfirmPayment,
  mockAdminFrom,
  mockMembershipUpdate,
  mockGenerateBookingReference,
} = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockReadActiveMembership: vi.fn(),
  mockCreateCheckoutSession: vi.fn(),
  mockInsertBooking: vi.fn(),
  mockUpdateCheckoutSession: vi.fn(),
  mockConfirmPayment: vi.fn(),
  mockAdminFrom: vi.fn(),
  mockMembershipUpdate: vi.fn(),
  mockGenerateBookingReference: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
  createServiceClient: vi.fn(() => ({
    from: mockAdminFrom,
  })),
}));

vi.mock("@/lib/membership/membership-reader", () => ({
  readActiveMembership: mockReadActiveMembership,
}));

vi.mock("@/lib/payment/gateway", () => ({
  getPaymentGateway: () => ({
    createCheckoutSession: mockCreateCheckoutSession,
  }),
}));

vi.mock("@/lib/payment/booking-repository", () => ({
  getBookingRepository: () => ({
    insertBooking: mockInsertBooking,
    updateCheckoutSession: mockUpdateCheckoutSession,
    confirmPayment: mockConfirmPayment,
  }),
}));

vi.mock("@/lib/pricing/booking-reference", () => ({
  generateBookingReference: mockGenerateBookingReference,
}));

import { POST } from "../route";

function req(body: unknown) {
  return new NextRequest("https://staging.butlersinc.com/api/create-checkout-session", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "203.0.113.10",
    },
  });
}

function validBody() {
  return {
    butlerType: "busy",
    serviceOption: "courier",
    serviceDate: "2099-01-01",
    startTime: "10:00",
    endTime: "12:00",
    serviceStartsAtUtc: "2099-01-01T10:00:00.000Z",
    customerPhone: "07700 900000",
  };
}

function mockMembershipUpdateResult(result: unknown) {
  const updateChain = {
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
  mockMembershipUpdate.mockReturnValue(updateChain);
  mockAdminFrom.mockReturnValue({ update: mockMembershipUpdate });
}

describe("POST /api/create-checkout-session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          email: "member@example.com",
          user_metadata: { name: "Member One" },
        },
      },
    });
    mockGenerateBookingReference.mockReturnValue("BT-PAID1");
    mockInsertBooking.mockResolvedValue({ id: "booking-1" });
    mockConfirmPayment.mockResolvedValue(undefined);
    mockUpdateCheckoutSession.mockResolvedValue(undefined);
    mockCreateCheckoutSession.mockResolvedValue({
      sessionId: "mock_session_1",
      url: "/payment/simulate?session_id=mock_session_1",
    });
    mockMembershipUpdateResult({ data: { id: "mem-1" }, error: null });
  });

  it("uses prepaid member hours and skips checkout when enough hours remain", async () => {
    mockReadActiveMembership.mockResolvedValue({
      isActive: true,
      membership: {
        id: "mem-1",
        status: "active",
        personal_hours_total: 10,
        personal_hours_used: 4,
      },
    });

    const res = await POST(req(validBody()));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      url: "/booking-confirmation?ref=BT-PAID1",
      bookingReference: "BT-PAID1",
      prepaid: true,
    });
    expect(mockCreateCheckoutSession).not.toHaveBeenCalled();
    expect(mockUpdateCheckoutSession).not.toHaveBeenCalled();
    expect(mockMembershipUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ personal_hours_used: 6 })
    );
    expect(mockConfirmPayment).toHaveBeenCalledWith("booking-1", null);
  });

  it("continues to checkout at member paid rate when prepaid hours are used up", async () => {
    mockReadActiveMembership.mockResolvedValue({
      isActive: true,
      membership: {
        id: "mem-1",
        status: "active",
        personal_hours_total: 5,
        personal_hours_used: 4,
      },
    });

    const res = await POST(req(validBody()));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      url: "/payment/simulate?session_id=mock_session_1",
      bookingReference: "BT-PAID1",
      sessionId: "mock_session_1",
    });
    expect(mockMembershipUpdate).not.toHaveBeenCalled();
    expect(mockConfirmPayment).not.toHaveBeenCalled();
    expect(mockInsertBooking).toHaveBeenCalledWith(
      expect.objectContaining({ urgency_label: "Member paid rate" })
    );
    expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 100 })
    );
    expect(mockUpdateCheckoutSession).toHaveBeenCalledWith(
      "booking-1",
      "mock_session_1"
    );
  });
});
