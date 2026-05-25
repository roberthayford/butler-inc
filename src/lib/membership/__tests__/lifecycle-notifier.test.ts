// src/lib/membership/__tests__/lifecycle-notifier.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendMock = vi.fn();
const upsertMock = vi.fn();
const updateMock = vi.fn();
const deleteMock = vi.fn();

vi.mock("resend", () => ({ Resend: vi.fn().mockImplementation(() => ({ emails: { send: sendMock } })) }));

function makeDb(opts: { upsertResult?: { data: unknown; error: unknown } } = {}) {
  const upsertResult = opts.upsertResult ?? { data: { event_id: "evt_1" }, error: null };
  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table !== "lifecycle_email_log") throw new Error("unexpected table " + table);
      return {
        upsert: (rows: unknown, options: unknown) => {
          upsertMock(rows, options);
          return { select: () => ({ maybeSingle: () => Promise.resolve(upsertResult) }) };
        },
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

  it("skips Resend when the lifecycle_email_log upsert ignores a duplicate (data null, error null)", async () => {
    await notifyLifecycle({
      eventId: "evt_dup",
      transition: { kind: "paused", tierSlug: "lite" },
      recipient: { email: "ada@example.com", name: "Ada" },
      subscriptionId: "sub_abc",
    }, makeDb({ upsertResult: { data: null, error: null } }) as never);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("logs and skips Resend when the upsert errors (DB failure, distinct from duplicate)", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await notifyLifecycle({
      eventId: "evt_dberr",
      transition: { kind: "paused", tierSlug: "lite" },
      recipient: { email: "ada@example.com", name: "Ada" },
      subscriptionId: "sub_abc",
    }, makeDb({ upsertResult: { data: null, error: { message: "connection reset", code: "08006" } } }) as never);
    expect(sendMock).not.toHaveBeenCalled();
    expect(errSpy).toHaveBeenCalledWith("lifecycle.email.log_insert_failed", expect.objectContaining({ eventId: "evt_dberr" }));
    errSpy.mockRestore();
  });

  it("upsert is invoked with the correct onConflict + ignoreDuplicates options", async () => {
    sendMock.mockResolvedValue({ data: { id: "x" }, error: null });
    await notifyLifecycle({
      eventId: "evt_opts",
      transition: { kind: "paused", tierSlug: "lite" },
      recipient: { email: "ada@example.com", name: "Ada" },
      subscriptionId: "sub_abc",
    }, makeDb() as never);
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ event_id: "evt_opts", transition: "paused", recipient: "member" }),
      expect.objectContaining({ onConflict: "event_id,transition,recipient", ignoreDuplicates: true }),
    );
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

  it("on Resend 429 (rate limit), treats as transient and deletes the log row so Stripe retry re-attempts", async () => {
    sendMock.mockResolvedValue({ data: null, error: { name: "rate_limit_exceeded", message: "Too many", statusCode: 429 } });
    await notifyLifecycle({
      eventId: "evt_429",
      transition: { kind: "paused", tierSlug: "lite" },
      recipient: { email: "ada@example.com", name: "Ada" },
      subscriptionId: "sub_abc",
    }, makeDb() as never);
    expect(deleteMock).toHaveBeenCalled();
  });

  it("on Resend 408 (request timeout), treats as transient and deletes the log row", async () => {
    sendMock.mockResolvedValue({ data: null, error: { name: "timeout", message: "Timed out", statusCode: 408 } });
    await notifyLifecycle({
      eventId: "evt_408",
      transition: { kind: "paused", tierSlug: "lite" },
      recipient: { email: "ada@example.com", name: "Ada" },
      subscriptionId: "sub_abc",
    }, makeDb() as never);
    expect(deleteMock).toHaveBeenCalled();
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
