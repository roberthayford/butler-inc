import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockExchange = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { exchangeCodeForSession: mockExchange },
  })),
}));

import { GET } from "../route";

describe("/auth/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    mockExchange.mockReset();
  });

  it("exchanges the code and redirects to the default destination on success", async () => {
    mockExchange.mockResolvedValue({ error: null });

    const req = new NextRequest(
      "https://staging.butlersinc.com/auth/callback?code=abc-123"
    );
    const res = await GET(req);

    expect(mockExchange).toHaveBeenCalledWith("abc-123");
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "https://staging.butlersinc.com/members/dashboard"
    );
  });

  it("honours the ?next= parameter when present", async () => {
    mockExchange.mockResolvedValue({ error: null });

    const req = new NextRequest(
      "https://butlersinc.com/auth/callback?code=xyz&next=/members/settings"
    );
    const res = await GET(req);

    expect(res.headers.get("location")).toBe(
      "https://butlersinc.com/members/settings"
    );
  });

  it("redirects to login with an error when no code is present", async () => {
    const req = new NextRequest(
      "https://staging.butlersinc.com/auth/callback"
    );
    const res = await GET(req);

    expect(mockExchange).not.toHaveBeenCalled();
    expect(res.headers.get("location")).toBe(
      "https://staging.butlersinc.com/members/login?error=auth-callback-failed"
    );
  });

  it("redirects to login with an error when the exchange fails", async () => {
    mockExchange.mockResolvedValue({
      error: { message: "invalid code" },
    });

    const req = new NextRequest(
      "https://staging.butlersinc.com/auth/callback?code=bad"
    );
    const res = await GET(req);

    expect(res.headers.get("location")).toBe(
      "https://staging.butlersinc.com/members/login?error=auth-callback-failed"
    );
  });

  it("rejects open-redirect attempts in ?next= by ignoring absolute URLs", async () => {
    mockExchange.mockResolvedValue({ error: null });

    const req = new NextRequest(
      "https://butlersinc.com/auth/callback?code=ok&next=https://evil.example.com/steal"
    );
    const res = await GET(req);

    expect(res.headers.get("location")).toBe(
      "https://butlersinc.com/members/dashboard"
    );
  });
});
