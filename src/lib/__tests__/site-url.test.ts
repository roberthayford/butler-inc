import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("getSiteUrl", () => {
  const originalEnv = process.env.NEXT_PUBLIC_SITE_URL;

  beforeEach(() => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_URL;
    } else {
      process.env.NEXT_PUBLIC_SITE_URL = originalEnv;
    }
  });

  it("returns the request origin when called with a Request-like object", async () => {
    const { getSiteUrl } = await import("../site-url");
    expect(
      getSiteUrl({ url: "https://staging.butlersinc.com/api/members/signup" })
    ).toBe("https://staging.butlersinc.com");
  });

  it("falls back to NEXT_PUBLIC_SITE_URL when no request is provided", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://butlersinc.com";
    const { getSiteUrl } = await import("../site-url");
    expect(getSiteUrl()).toBe("https://butlersinc.com");
  });

  it("strips a trailing slash from NEXT_PUBLIC_SITE_URL", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://butlersinc.com/";
    const { getSiteUrl } = await import("../site-url");
    expect(getSiteUrl()).toBe("https://butlersinc.com");
  });

  it("falls back to http://localhost:3000 when nothing else is set", async () => {
    const { getSiteUrl } = await import("../site-url");
    expect(getSiteUrl()).toBe("http://localhost:3000");
  });

  it("prefers the request origin over the env var when both are present", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://butlersinc.com";
    const { getSiteUrl } = await import("../site-url");
    expect(
      getSiteUrl({ url: "https://staging.butlersinc.com/foo" })
    ).toBe("https://staging.butlersinc.com");
  });
});
