import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetUser = vi.fn();
const mockEq = vi.fn();
const mockUpdate = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn(() => ({ update: mockUpdate }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { updateButlerContent } from "../actions";

const cleanContent = {
  hero: {
    headline: "When time is of the essence.",
    subheading: "Fast, reliable deliveries across London.",
  },
  trustIndicators: ["DBS checked", "Insured for items up to £50,000"],
  commonRequests: ["Keys collected from estate agent on moving day"],
};

describe("updateButlerContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "admin-1" } } });
    mockEq.mockResolvedValue({ error: null });
  });

  it("rejects content containing an em dash and does not write to the DB", async () => {
    const result = await updateButlerContent("busy", {
      ...cleanContent,
      commonRequests: ["Contract signing across London—collected same day"],
    });

    expect(result.error).toMatch(/em dash/i);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("saves clean content", async () => {
    const result = await updateButlerContent("busy", cleanContent);

    expect(result.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  it("still rejects unauthenticated callers before policy checks", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await updateButlerContent("busy", cleanContent);

    expect(result.error).toMatch(/not authenticated/i);
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
