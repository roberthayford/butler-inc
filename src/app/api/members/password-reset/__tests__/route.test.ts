import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockReset = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { resetPasswordForEmail: mockReset },
  })),
}));

import { POST } from "../route";

function postRequest(url: string, body: unknown, ip: string) {
  return new NextRequest(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
  });
}

describe("POST /api/members/password-reset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReset.mockResolvedValue({ error: null });
  });

  it("returns 200 and calls resetPasswordForEmail with redirectTo derived from the request origin", async () => {
    const req = postRequest(
      "https://staging.butlersinc.com/api/members/password-reset",
      { email: "user@example.com" },
      "1.1.1.1",
    );
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockReset).toHaveBeenCalledTimes(1);
    expect(mockReset.mock.calls[0][0]).toBe("user@example.com");
    expect(mockReset.mock.calls[0][1].redirectTo).toBe(
      "https://staging.butlersinc.com/auth/callback?next=/members/reset-password",
    );
  });

  it("returns 200 even when Supabase reports an error (no account enumeration)", async () => {
    mockReset.mockResolvedValue({ error: { message: "User not found" } });
    const req = postRequest(
      "https://butlersinc.com/api/members/password-reset",
      { email: "ghost@example.com" },
      "2.2.2.2",
    );
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("returns 400 on invalid email without calling Supabase", async () => {
    const req = postRequest(
      "https://butlersinc.com/api/members/password-reset",
      { email: "not-an-email" },
      "3.3.3.3",
    );
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(mockReset).not.toHaveBeenCalled();
  });

  it("returns 429 when the rate limit is exceeded", async () => {
    const ip = "4.4.4.4";
    let res!: Response;
    for (let i = 0; i < 6; i++) {
      res = await POST(
        postRequest("https://butlersinc.com/api/members/password-reset", { email: "user@example.com" }, ip),
      );
    }
    expect(res.status).toBe(429);
  });

  it("returns 400 on a non-JSON body without calling Supabase", async () => {
    const req = new NextRequest("https://butlersinc.com/api/members/password-reset", {
      method: "POST",
      body: "not json",
      headers: { "content-type": "application/json", "x-forwarded-for": "5.5.5.5" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(mockReset).not.toHaveBeenCalled();
  });
});
