import { describe, it, expect, vi } from "vitest";
import { readActiveMembership } from "../membership-reader";

const TODAY = "2026-05-24";

type MembershipRow = {
  id: string;
  status: string;
  personal_hours_used: number;
  virtual_tasks_used: number;
  billing_period_start: string;
  billing_period_end: string;
};

function mockAnonClient(result: { data: MembershipRow | null; error: { code?: string } | null }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
  return {
    from: vi.fn().mockReturnValue(chain),
  };
}

function mockServiceClient(updateResult: { data: MembershipRow | null; error: { message?: string } | null }) {
  const updateChain = {
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(updateResult),
  };
  return {
    from: vi.fn().mockReturnValue({
      update: vi.fn().mockReturnValue(updateChain),
    }),
  };
}

describe("readActiveMembership", () => {
  const currentPeriodMembership: MembershipRow = {
    id: "mem-1",
    status: "active",
    personal_hours_used: 3,
    virtual_tasks_used: 1,
    billing_period_start: "2026-05-01",
    billing_period_end: "2026-05-31",
  };

  const expiredMembership: MembershipRow = {
    id: "mem-1",
    status: "active",
    personal_hours_used: 9,
    virtual_tasks_used: 4,
    billing_period_start: "2026-04-01",
    billing_period_end: "2026-04-30",
  };

  it("returns null + isActive=false for null userId", async () => {
    const anon = mockAnonClient({ data: null, error: null });
    const svc = mockServiceClient({ data: null, error: null });
    const result = await readActiveMembership(null, anon as never, svc as never, TODAY);
    expect(result).toEqual({ membership: null, isActive: false });
    expect(anon.from).not.toHaveBeenCalled();
    expect(svc.from).not.toHaveBeenCalled();
  });

  it("returns null + isActive=false when no membership row", async () => {
    const anon = mockAnonClient({ data: null, error: null });
    const svc = mockServiceClient({ data: null, error: null });
    const result = await readActiveMembership("user-1", anon as never, svc as never, TODAY);
    expect(result.membership).toBeNull();
    expect(result.isActive).toBe(false);
  });

  it("returns active=true when period covers today, without writing", async () => {
    const anon = mockAnonClient({ data: currentPeriodMembership, error: null });
    const svc = mockServiceClient({ data: null, error: null });
    const result = await readActiveMembership("user-1", anon as never, svc as never, TODAY);
    expect(result.isActive).toBe(true);
    expect(result.membership).toBe(currentPeriodMembership);
    expect(svc.from).not.toHaveBeenCalled();
  });

  it("resets expired period via service client and returns the freshened row", async () => {
    const updated = {
      ...expiredMembership,
      personal_hours_used: 0,
      virtual_tasks_used: 0,
      billing_period_start: "2026-05-01",
      billing_period_end: "2026-05-31",
    };
    const anon = mockAnonClient({ data: expiredMembership, error: null });
    const svc = mockServiceClient({ data: updated, error: null });
    const result = await readActiveMembership("user-1", anon as never, svc as never, TODAY);
    expect(result.isActive).toBe(true);
    expect(result.membership?.personal_hours_used).toBe(0);
    expect(result.membership?.billing_period_end).toBe("2026-05-31");
    expect(svc.from).toHaveBeenCalledWith("memberships");
  });

  it("applies optimistic lock on billing_period_end during reset", async () => {
    const anon = mockAnonClient({ data: expiredMembership, error: null });
    const svc = mockServiceClient({ data: expiredMembership, error: null });
    await readActiveMembership("user-1", anon as never, svc as never, TODAY);
    const updateChain = svc.from.mock.results[0]!.value.update.mock.results[0]!.value;
    // Should filter by both id AND the old billing_period_end (optimistic lock)
    expect(updateChain.eq).toHaveBeenCalledWith("id", "mem-1");
    expect(updateChain.eq).toHaveBeenCalledWith("billing_period_end", "2026-04-30");
  });

  it("returns isActive=false when reset write fails (fails closed)", async () => {
    const anon = mockAnonClient({ data: expiredMembership, error: null });
    const svc = mockServiceClient({ data: null, error: { message: "DB error" } });
    const result = await readActiveMembership("user-1", anon as never, svc as never, TODAY);
    // Membership still returned (for dashboard display) but treated as inactive (no member pricing)
    expect(result.membership).toBe(expiredMembership);
    expect(result.isActive).toBe(false);
  });

  it("filters anon query with status IN active/past_due/paused/cancelled (PlanManager needs all four)", async () => {
    const anon = mockAnonClient({ data: currentPeriodMembership, error: null });
    const svc = mockServiceClient({ data: null, error: null });
    await readActiveMembership("user-1", anon as never, svc as never, TODAY);
    const chain = anon.from.mock.results[0]!.value;
    expect(chain.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(chain.in).toHaveBeenCalledWith("status", ["active", "past_due", "paused", "cancelled"]);
  });

  it("returns past_due row for display but isActive=false (payment failing, member pricing suspended)", async () => {
    const pastDueMembership: MembershipRow = {
      id: "mem-1",
      status: "past_due",
      personal_hours_used: 3,
      virtual_tasks_used: 1,
      billing_period_start: "2026-05-01",
      billing_period_end: "2026-05-31",
    };
    const anon = mockAnonClient({ data: pastDueMembership, error: null });
    const svc = mockServiceClient({ data: null, error: null });
    const result = await readActiveMembership("user-1", anon as never, svc as never, TODAY);
    // Row is returned so dashboard can show "payment is failing" state
    expect(result.membership).toBe(pastDueMembership);
    // But member pricing is not applied
    expect(result.isActive).toBe(false);
    // Service client is never called — no period reset for past_due rows
    expect(svc.from).not.toHaveBeenCalled();
  });

  it("returns paused row for PlanManager but isActive=false (no member pricing, no rollover)", async () => {
    const pausedMembership: MembershipRow = {
      id: "mem-1",
      status: "paused",
      personal_hours_used: 3,
      virtual_tasks_used: 1,
      billing_period_start: "2026-05-01",
      billing_period_end: "2026-05-31",
    };
    const anon = mockAnonClient({ data: pausedMembership, error: null });
    const svc = mockServiceClient({ data: null, error: null });
    const result = await readActiveMembership("user-1", anon as never, svc as never, TODAY);
    expect(result.membership).toBe(pausedMembership);
    expect(result.isActive).toBe(false);
    expect(svc.from).not.toHaveBeenCalled();
  });

  it("returns cancelled row for PlanManager but isActive=false", async () => {
    const cancelledMembership: MembershipRow = {
      id: "mem-1",
      status: "cancelled",
      personal_hours_used: 0,
      virtual_tasks_used: 0,
      billing_period_start: "2026-04-01",
      billing_period_end: "2026-04-30",
    };
    const anon = mockAnonClient({ data: cancelledMembership, error: null });
    const svc = mockServiceClient({ data: null, error: null });
    const result = await readActiveMembership("user-1", anon as never, svc as never, TODAY);
    expect(result.membership).toBe(cancelledMembership);
    expect(result.isActive).toBe(false);
    expect(svc.from).not.toHaveBeenCalled();
  });
});
