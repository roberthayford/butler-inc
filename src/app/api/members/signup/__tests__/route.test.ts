import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockSignUp = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { signUp: mockSignUp },
  })),
}));

import { POST } from "../route";

function postRequest(url: string, body: unknown) {
  return new NextRequest(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

const validBody = {
  name: "Test User",
  email: "test@example.com",
  password: "supersecret",
  phone: "07123456789",
};

describe("POST /api/members/signup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignUp.mockResolvedValue({ error: null });
  });

  it("passes emailRedirectTo derived from the request origin so confirmation links point at the same host", async () => {
    const req = postRequest(
      "https://staging.butlersinc.com/api/members/signup",
      validBody
    );

    const res = await POST(req);
    expect(res.status).toBe(200);

    expect(mockSignUp).toHaveBeenCalledTimes(1);
    const call = mockSignUp.mock.calls[0][0];
    expect(call.options.emailRedirectTo).toBe(
      "https://staging.butlersinc.com/auth/callback"
    );
  });

  it("uses the production origin when called from production", async () => {
    const req = postRequest(
      "https://butlersinc.com/api/members/signup",
      validBody
    );

    await POST(req);
    const call = mockSignUp.mock.calls[0][0];
    expect(call.options.emailRedirectTo).toBe(
      "https://butlersinc.com/auth/callback"
    );
  });

  it("returns 400 on invalid body without calling Supabase", async () => {
    const req = postRequest(
      "https://staging.butlersinc.com/api/members/signup",
      { email: "not-an-email" }
    );

    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(mockSignUp).not.toHaveBeenCalled();
  });
});
