// src/lib/membership/__tests__/lifecycle-notifier.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendMock = vi.fn();
const insertMock = vi.fn();
const updateMock = vi.fn();
const deleteMock = vi.fn();

vi.mock("resend", () => ({ Resend: vi.fn().mockImplementation(() => ({ emails: { send: sendMock } })) }));

function makeDb() {
  insertMock.mockReturnValue({ select: () => ({ maybeSingle: () => Promise.resolve({ data: { event_id: "evt_1" } }) }) });
  updateMock.mockReturnValue({ eq: () => ({ eq: () => ({ eq: () => Promise.resolve({ data: null }) }) }) });
  deleteMock.mockReturnValue({ eq: () => ({ eq: () => ({ eq: () => Promise.resolve({ data: null }) }) }) });
  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table !== "lifecycle_email_log") throw new Error("unexpected table " + table);
      return {
        insert: (rows: unknown) => { insertMock(rows); return { select: () => ({ maybeSingle: () => Promise.resolve({ data: { event_id: "evt_1" } }) }) }; },
        update: (patch: unknown) => { updateMock(patch); return { eq: () => ({ eq: () => ({ eq: () => Promise.resolve({ data: null }) }) }) }; },
        delete: () => { deleteMock(); return { eq: () => ({ eq: () => ({ eq: () => Promise.resolve({ data: null }) }) }) }; },
      };
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.RESEND_API_KEY = "re_test";
  process.env.MEMBERSHIP_ADMIN_NOTIFY_EMAIL = "admin@example.com";
});

afterEach(() => {
  delete process.env.RESEND_API_KEY;
  delete process.env.MEMBERSHIP_ADMIN_NOTIFY_EMAIL;
});

import { notifyLifecycle } from "../lifecycle-notifier";

describe("notifyLifecycle", () => {
  it("sends the member welcome email and the admin new-member email for activated", async () => {
    sendMock.mockResolvedValue({ data: { id: "re_id_1" }, error: null });
    await notifyLifecycle({
      eventId: "evt_1",
      transition: { kind: "activated", tierSlug: "lite", hoursTotal: 10, tasksTotal: 5, renewsAt: "25 Jun 2026" },
      recipient: { email: "ada@example.com", name: "Ada" },
      subscriptionId: "sub_abc",
    }, makeDb() as never);

    expect(sendMock).toHaveBeenCalledTimes(2);
    const memberCall = sendMock.mock.calls.find(([c]) => c.to === "ada@example.com");
    const adminCall = sendMock.mock.calls.find(([c]) => c.to === "admin@example.com");
    expect(memberCall?.[0].subject).toBe("Welcome to Butlers Inc Lite");
    expect(adminCall?.[0].subject).toBe("New Lite member: Ada");
  });

  it("skips Resend when the lifecycle_email_log insert returns no row (duplicate)", async () => {
    const db = {
      from: vi.fn().mockReturnValue({
        insert: () => ({ select: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }),
      }),
    };
    await notifyLifecycle({
      eventId: "evt_dup",
      transition: { kind: "paused", tierSlug: "lite" },
      recipient: { email: "ada@example.com", name: "Ada" },
      subscriptionId: "sub_abc",
    }, db as never);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("on Resend 5xx, deletes the log row so Stripe retry can re-attempt", async () => {
    sendMock.mockResolvedValue({ data: null, error: { name: "API_ERROR", message: "Internal", statusCode: 500 } });
    await notifyLifecycle({
      eventId: "evt_2",
      transition: { kind: "paused", tierSlug: "lite" },
      recipient: { email: "ada@example.com", name: "Ada" },
      subscriptionId: "sub_abc",
    }, makeDb() as never);
    expect(deleteMock).toHaveBeenCalled();
  });

  it("on Resend 4xx, keeps the log row to prevent a retry storm", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    sendMock.mockResolvedValue({ data: null, error: { name: "validation_error", message: "Invalid to", statusCode: 422 } });
    await notifyLifecycle({
      eventId: "evt_3",
      transition: { kind: "paused", tierSlug: "lite" },
      recipient: { email: "ada@example.com", name: "Ada" },
      subscriptionId: "sub_abc",
    }, makeDb() as never);
    expect(deleteMock).not.toHaveBeenCalled();
    expect(errSpy).toHaveBeenCalledWith("lifecycle.email.permanent_failure", expect.any(Object));
    errSpy.mockRestore();
  });

  it("does not throw when transition is noop", async () => {
    await notifyLifecycle({
      eventId: "evt_4",
      transition: { kind: "noop" },
      recipient: { email: "ada@example.com", name: "Ada" },
      subscriptionId: "sub_abc",
    }, makeDb() as never);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("sends only member email when admin recipient is not resolved", async () => {
    delete process.env.MEMBERSHIP_ADMIN_NOTIFY_EMAIL;
    delete process.env.BOOKING_ADMIN_NOTIFY_EMAIL;
    delete process.env.ADMIN_EMAILS;
    sendMock.mockResolvedValue({ data: { id: "x" }, error: null });
    await notifyLifecycle({
      eventId: "evt_5",
      transition: { kind: "activated", tierSlug: "lite", hoursTotal: 10, tasksTotal: 5, renewsAt: "25 Jun 2026" },
      recipient: { email: "ada@example.com", name: "Ada" },
      subscriptionId: "sub_abc",
    }, makeDb() as never);
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock.mock.calls[0][0].to).toBe("ada@example.com");
  });
});
