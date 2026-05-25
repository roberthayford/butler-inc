import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveAdminRecipient } from "../admin-recipient";

const SAVED = {
  M: process.env.MEMBERSHIP_ADMIN_NOTIFY_EMAIL,
  B: process.env.BOOKING_ADMIN_NOTIFY_EMAIL,
  A: process.env.ADMIN_EMAILS,
};

describe("resolveAdminRecipient", () => {
  beforeEach(() => {
    delete process.env.MEMBERSHIP_ADMIN_NOTIFY_EMAIL;
    delete process.env.BOOKING_ADMIN_NOTIFY_EMAIL;
    delete process.env.ADMIN_EMAILS;
  });
  afterEach(() => {
    process.env.MEMBERSHIP_ADMIN_NOTIFY_EMAIL = SAVED.M;
    process.env.BOOKING_ADMIN_NOTIFY_EMAIL = SAVED.B;
    process.env.ADMIN_EMAILS = SAVED.A;
  });

  it("prefers MEMBERSHIP_ADMIN_NOTIFY_EMAIL", () => {
    process.env.MEMBERSHIP_ADMIN_NOTIFY_EMAIL = "memberships@x";
    process.env.BOOKING_ADMIN_NOTIFY_EMAIL = "bookings@x";
    process.env.ADMIN_EMAILS = "a@x,b@x";
    expect(resolveAdminRecipient()).toBe("memberships@x");
  });

  it("falls back to BOOKING_ADMIN_NOTIFY_EMAIL", () => {
    process.env.BOOKING_ADMIN_NOTIFY_EMAIL = "bookings@x";
    process.env.ADMIN_EMAILS = "a@x,b@x";
    expect(resolveAdminRecipient()).toBe("bookings@x");
  });

  it("falls back to first ADMIN_EMAILS entry", () => {
    process.env.ADMIN_EMAILS = "a@x , b@x";
    expect(resolveAdminRecipient()).toBe("a@x");
  });

  it("returns null when nothing is set", () => {
    expect(resolveAdminRecipient()).toBeNull();
  });
});
