import { describe, it, expect } from "vitest";

// Test the route-matching logic in isolation
const UNPROTECTED_PATHS = ["/members/login", "/members/signup"];

function shouldRedirectToLogin(pathname: string, isAuthenticated: boolean): boolean {
  if (isAuthenticated) return false;

  const isMembers = pathname.startsWith("/members");
  const isAdmin = pathname.startsWith("/admin");

  if (!isMembers && !isAdmin) return false;

  // Login and signup are public
  if (UNPROTECTED_PATHS.some((p) => pathname.startsWith(p))) return false;

  return true;
}

describe("Middleware auth routing logic", () => {
  it("redirects unauthenticated /members/dashboard to login", () => {
    expect(shouldRedirectToLogin("/members/dashboard", false)).toBe(true);
  });

  it("redirects unauthenticated /members/personal-butler to login", () => {
    expect(shouldRedirectToLogin("/members/personal-butler", false)).toBe(true);
  });

  it("redirects unauthenticated /members/virtual-butler to login", () => {
    expect(shouldRedirectToLogin("/members/virtual-butler", false)).toBe(true);
  });

  it("redirects unauthenticated /members/settings to login", () => {
    expect(shouldRedirectToLogin("/members/settings", false)).toBe(true);
  });

  it("redirects unauthenticated /admin to login", () => {
    expect(shouldRedirectToLogin("/admin", false)).toBe(true);
  });

  it("does NOT redirect /members/login", () => {
    expect(shouldRedirectToLogin("/members/login", false)).toBe(false);
  });

  it("does NOT redirect /members/signup", () => {
    expect(shouldRedirectToLogin("/members/signup", false)).toBe(false);
  });

  it("does NOT redirect authenticated users", () => {
    expect(shouldRedirectToLogin("/members/dashboard", true)).toBe(false);
    expect(shouldRedirectToLogin("/members/personal-butler", true)).toBe(false);
  });
});
