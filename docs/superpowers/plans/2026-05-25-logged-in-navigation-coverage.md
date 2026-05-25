# Logged-in Navigation Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put the global Header + Footer on every logged-in / internal page (`/members/*`, `/membership`, `/booking-confirmation`); replace the bespoke per-page headers and back links with a single account menu inside the Header; suppress the Header's `Sign In` / `Join` CTAs on `/members/login` and `/members/signup`.

**Architecture:** Per-segment layouts (matching the existing `/butlers` and `/(legal)` pattern) inject `<Header />` and `<Footer />`. A new `<AccountMenu />` client component replaces the standalone Dashboard button for logged-in users and houses `Dashboard`, `Settings`, `Admin` (conditional), and `Sign Out`. Header reads `usePathname()` to suppress logged-out CTAs on the two auth pages.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind v4, Supabase auth via `@/context/AuthContext`, Vitest + Testing Library (jsdom), sonner toasts. No new dependencies.

**Spec:** [`docs/superpowers/specs/2026-05-25-logged-in-navigation-coverage-design.md`](../specs/2026-05-25-logged-in-navigation-coverage-design.md) (commit `339a8dd`).

**Branch convention:** create a feature branch off `staging`. No merges to `main` without explicit user approval.

---

## Task ordering rationale

Tasks 1 and 2 build the `AccountMenu` and wire it into `Header` first — this gives logged-in users a Sign Out affordance via the global Header *before* we strip the bespoke headers (which currently host the only Sign Out button).

Task 3 combines "add Header to `members/layout`" + "strip the dashboard's bespoke header" in a single commit so the dashboard never ships with two stacked headers. Tasks 4–6 then remove the back-link affordances from the other member pages (they have no inline header to clash with — Header just sits above them once Task 3 ships).

Tasks 7 and 8 add the layouts to `/membership` and `/booking-confirmation`, which have no bespoke chrome to clean up. Task 9 is the manual QA pass before opening the PR.

---

## File structure

**Created:**
- `src/components/landing/AccountMenu.tsx` — new client component
- `src/components/landing/__tests__/AccountMenu.test.tsx` — unit tests for AccountMenu
- `src/app/membership/layout.tsx` — new layout (Header + main + Footer)
- `src/app/membership/__tests__/layout.test.tsx` — layout smoke test
- `src/app/booking-confirmation/layout.tsx` — new layout
- `src/app/booking-confirmation/__tests__/layout.test.tsx` — layout smoke test
- `src/app/members/__tests__/layout.test.tsx` — layout smoke test
- `src/app/members/dashboard/__tests__/page.test.tsx` — regression test for header removal *(only if no test file exists for this page; check first)*

**Modified:**
- `src/app/members/layout.tsx` — add Header + main wrapper + Footer
- `src/components/landing/Header.tsx` — swap standalone `Dashboard` link for `<AccountMenu />`; add `usePathname()`-based CTA suppression for auth pages
- `src/components/landing/__tests__/Header.test.tsx` — extend with suppression + AccountMenu integration tests
- `src/app/members/dashboard/page.tsx` — remove bespoke inline header (lines 62-87)
- `src/app/members/settings/page.tsx` — remove `← Back to Dashboard` Link (lines 137-143)
- `src/app/members/personal-butler/page.tsx` — remove `← Back to Dashboard` Link (lines 39-45)
- `src/app/members/virtual-butler/page.tsx` — remove `← Back to Dashboard` Link (lines 105-111)

**Untouched (verified during planning):**
- `src/app/layout.tsx` — root stays bare (Providers + GenieStickyBar only)
- `src/app/page.tsx` — homepage keeps its inline `<Header />` + `<Footer />`
- `src/app/butlers/layout.tsx` — already follows the target pattern
- `src/app/(legal)/layout.tsx` — already follows the target pattern
- `src/context/AuthContext.tsx` — `signOut: () => Promise<void>` is already exposed (line 31, 93-95)
- `src/components/landing/Footer.tsx` — used as-is

---

## Pre-flight

- [ ] **Step 0.1: Create feature branch off `staging`**

```bash
git checkout staging
git pull --ff-only
git checkout -b nav/global-header-coverage
```

- [ ] **Step 0.2: Verify clean working tree and test baseline**

```bash
git status
npm run test:run
```

Expected: clean tree; all existing tests pass.

---

## Task 1: Build `<AccountMenu />` (TDD, no integration yet)

**Files:**
- Create: `src/components/landing/AccountMenu.tsx`
- Create: `src/components/landing/__tests__/AccountMenu.test.tsx`

**Behaviour contract:**
- Renders nothing when no user.
- Renders a circular trigger button containing the user's initials (from `user_metadata.name`, else first letter of email).
- Trigger click toggles the menu open/closed; `aria-expanded` reflects state.
- Menu contains, in order: `Dashboard` link → `Settings` link → `Admin` link (only if `isAdmin(email)`) → divider → `Sign Out` button.
- Escape closes menu and returns focus to trigger.
- Click outside both the trigger and menu closes the menu.
- ArrowDown / ArrowUp on the open menu cycles focus between menu items (wraps).
- Sign Out: awaits `signOut()` from `useAuth()`, toasts `"Signed out"`, navigates to `/`.
- Sign Out failure: toasts `"Sign out failed. Try again."`, no navigation.

- [ ] **Step 1.1: Write the failing test file**

Create `src/components/landing/__tests__/AccountMenu.test.tsx`:

```tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@/test/test-utils";
import { AccountMenu } from "../AccountMenu";

const mockSignOut = vi.fn();
const mockPush = vi.fn();
const useAuthMock = vi.fn();
const isAdminMock = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("@/lib/admin", () => ({
  isAdmin: (email?: string) => isAdminMock(email),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  notFound: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: toastSuccess, error: toastError },
}));

function setUser(overrides: Partial<{ email: string; name: string }> = {}) {
  useAuthMock.mockReturnValue({
    user: {
      email: overrides.email ?? "ada@example.com",
      user_metadata: overrides.name !== undefined ? { name: overrides.name } : {},
    },
    signOut: mockSignOut,
  });
}

describe("AccountMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isAdminMock.mockReturnValue(false);
    mockSignOut.mockResolvedValue(undefined);
  });

  it("renders nothing when no user", () => {
    useAuthMock.mockReturnValue({ user: null, signOut: mockSignOut });
    const { container } = render(<AccountMenu />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders initials from name when present", () => {
    setUser({ name: "Ada Lovelace" });
    render(<AccountMenu />);
    expect(screen.getByRole("button", { name: /account menu/i })).toHaveTextContent("AL");
  });

  it("falls back to first letter of email when no name", () => {
    setUser({ email: "ada@example.com" });
    render(<AccountMenu />);
    expect(screen.getByRole("button", { name: /account menu/i })).toHaveTextContent("A");
  });

  it("menu is closed by default", () => {
    setUser();
    render(<AccountMenu />);
    expect(screen.queryByRole("menu")).toBeNull();
    expect(screen.getByRole("button", { name: /account menu/i })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("clicking trigger opens the menu with Dashboard, Settings, Sign Out", () => {
    setUser();
    render(<AccountMenu />);
    fireEvent.click(screen.getByRole("button", { name: /account menu/i }));
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /dashboard/i })).toHaveAttribute(
      "href",
      "/members/dashboard",
    );
    expect(screen.getByRole("menuitem", { name: /settings/i })).toHaveAttribute(
      "href",
      "/members/settings",
    );
    expect(screen.getByRole("menuitem", { name: /sign out/i })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /admin/i })).toBeNull();
  });

  it("shows Admin item only when isAdmin returns true", () => {
    setUser();
    isAdminMock.mockReturnValue(true);
    render(<AccountMenu />);
    fireEvent.click(screen.getByRole("button", { name: /account menu/i }));
    expect(screen.getByRole("menuitem", { name: /admin/i })).toHaveAttribute("href", "/admin");
  });

  it("Sign Out calls signOut, toasts success, and pushes to /", async () => {
    setUser();
    render(<AccountMenu />);
    fireEvent.click(screen.getByRole("button", { name: /account menu/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /sign out/i }));
    await waitFor(() => expect(mockSignOut).toHaveBeenCalledTimes(1));
    expect(toastSuccess).toHaveBeenCalledWith("Signed out");
    expect(mockPush).toHaveBeenCalledWith("/");
  });

  it("Sign Out failure shows error toast and does not navigate", async () => {
    setUser();
    mockSignOut.mockRejectedValueOnce(new Error("network"));
    render(<AccountMenu />);
    fireEvent.click(screen.getByRole("button", { name: /account menu/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /sign out/i }));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Sign out failed. Try again."));
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("Escape closes the menu and returns focus to trigger", () => {
    setUser();
    render(<AccountMenu />);
    const trigger = screen.getByRole("button", { name: /account menu/i });
    fireEvent.click(trigger);
    expect(screen.getByRole("menu")).toBeInTheDocument();
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(screen.queryByRole("menu")).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it("clicking outside closes the menu", () => {
    setUser();
    render(
      <div>
        <button data-testid="outside">outside</button>
        <AccountMenu />
      </div>,
    );
    fireEvent.click(screen.getByRole("button", { name: /account menu/i }));
    expect(screen.getByRole("menu")).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByTestId("outside"));
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("ArrowDown from trigger focuses first menu item; ArrowDown from last wraps to first", () => {
    setUser();
    render(<AccountMenu />);
    fireEvent.click(screen.getByRole("button", { name: /account menu/i }));
    const menu = screen.getByRole("menu");
    const items = screen.getAllByRole("menuitem");
    fireEvent.keyDown(menu, { key: "ArrowDown" });
    expect(items[0]).toHaveFocus();
    items[items.length - 1].focus();
    fireEvent.keyDown(menu, { key: "ArrowDown" });
    expect(items[0]).toHaveFocus();
  });
});
```

- [ ] **Step 1.2: Run the test and confirm failures**

```bash
npm run test:run -- src/components/landing/__tests__/AccountMenu.test.tsx
```

Expected: every test fails with "Cannot find module '../AccountMenu'".

- [ ] **Step 1.3: Create the AccountMenu component**

Create `src/components/landing/AccountMenu.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";
import { useAuth } from "@/context/AuthContext";
import { isAdmin } from "@/lib/admin";

function getInitials(user: User): string {
  const name = (user.user_metadata?.name as string | undefined)?.trim();
  if (name) {
    const parts = name.split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0][0].toUpperCase();
  }
  return (user.email?.[0] ?? "?").toUpperCase();
}

export function AccountMenu() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current && !menuRef.current.contains(target) &&
        triggerRef.current && !triggerRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };

    const handleEscape = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  if (!user) return null;

  const handleSignOut = async () => {
    setOpen(false);
    try {
      await signOut();
      toast.success("Signed out");
      router.push("/");
    } catch {
      toast.error("Sign out failed. Try again.");
    }
  };

  const handleMenuKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]');
    if (!items || items.length === 0) return;
    const current = Array.from(items).findIndex((el) => el === document.activeElement);
    const next =
      e.key === "ArrowDown"
        ? current < items.length - 1 ? current + 1 : 0
        : current > 0 ? current - 1 : items.length - 1;
    items[next].focus();
  };

  const showAdmin = isAdmin(user.email ?? undefined);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="w-9 h-9 rounded-full border border-brass/60 bg-charcoal text-brass-text text-sm font-medium flex items-center justify-center hover:bg-brass/10 transition-colors focus-visible:outline-2 focus-visible:outline-brass"
      >
        {getInitials(user)}
      </button>
      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Account menu"
          onKeyDown={handleMenuKeyDown}
          className="absolute right-0 mt-2 w-48 bg-charcoal border border-primary-foreground/15 rounded-sm shadow-lg py-1 z-[110]"
        >
          <Link
            href="/members/dashboard"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-optical-white hover:bg-primary-foreground/10 focus:bg-primary-foreground/10 focus:outline-none"
          >
            Dashboard
          </Link>
          <Link
            href="/members/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-optical-white hover:bg-primary-foreground/10 focus:bg-primary-foreground/10 focus:outline-none"
          >
            Settings
          </Link>
          {showAdmin && (
            <Link
              href="/admin"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-optical-white hover:bg-primary-foreground/10 focus:bg-primary-foreground/10 focus:outline-none"
            >
              Admin
            </Link>
          )}
          <div className="my-1 border-t border-primary-foreground/10" />
          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            className="block w-full text-left px-4 py-2 text-sm text-optical-white hover:bg-primary-foreground/10 focus:bg-primary-foreground/10 focus:outline-none"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 1.4: Run the test and confirm all pass**

```bash
npm run test:run -- src/components/landing/__tests__/AccountMenu.test.tsx
```

Expected: all 10 tests pass.

- [ ] **Step 1.5: Commit**

```bash
git add src/components/landing/AccountMenu.tsx src/components/landing/__tests__/AccountMenu.test.tsx
git commit -m "feat(landing): add AccountMenu dropdown with Sign Out

Headless dropdown (no shadcn dependency added) with Dashboard,
Settings, conditional Admin link, and Sign Out. Keyboard a11y
(Escape, arrow keys), click-outside, and toast feedback on
sign-out success/failure. Not yet wired into Header."
```

---

## Task 2: Wire `<AccountMenu />` into `<Header />`; suppress Sign In / Join on auth pages

**Files:**
- Modify: `src/components/landing/Header.tsx`
- Modify: `src/components/landing/__tests__/Header.test.tsx`

**Behaviour changes to Header:**
- Reads `usePathname()` and hides `Sign In` + `Join` (desktop and mobile) when pathname is `/members/login` or `/members/signup`.
- For logged-in users on desktop, replaces the standalone `Dashboard` link (lines 80-85) with `<AccountMenu />`.
- Mobile menu keeps inline `Dashboard` + `Admin` links **and** adds a `Sign Out` button so mobile users have parity with the desktop AccountMenu. (The desktop AccountMenu is a popover; on mobile we expand the items inline inside the existing hamburger sheet.)

- [ ] **Step 2.1: Replace `Header.test.tsx` contents with the extended suite**

Replace the existing `src/components/landing/__tests__/Header.test.tsx`:

```tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@/test/test-utils";
import { Header } from "../Header";

let pathname = "/";
const useAuthMock = vi.fn();
const isAdminMock = vi.fn();

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("@/lib/admin", () => ({
  isAdmin: (email?: string) => isAdminMock(email),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => pathname,
  useSearchParams: () => new URLSearchParams(),
  notFound: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const loggedOut = { user: null, loading: false, signOut: vi.fn() };
const loggedIn = {
  user: { email: "ada@example.com", user_metadata: { name: "Ada" } },
  loading: false,
  signOut: vi.fn(),
};
const loading = { user: null, loading: true, signOut: vi.fn() };

describe("Header", () => {
  beforeEach(() => {
    pathname = "/";
    vi.clearAllMocks();
    isAdminMock.mockReturnValue(false);
  });

  it("Join CTA links to /membership (not /members/signup)", () => {
    useAuthMock.mockReturnValue(loggedOut);
    render(<Header />);
    const joinLinks = screen.getAllByRole("link", { name: /^join$/i });
    expect(joinLinks.length).toBeGreaterThan(0);
    joinLinks.forEach((link) => {
      expect(link).toHaveAttribute("href", "/membership");
    });
  });

  it("logged-out user on / sees Sign In and Join", () => {
    useAuthMock.mockReturnValue(loggedOut);
    render(<Header />);
    expect(screen.getAllByRole("link", { name: /sign in/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /^join$/i }).length).toBeGreaterThan(0);
  });

  it("logged-out user on /members/login does NOT see Sign In or Join", () => {
    pathname = "/members/login";
    useAuthMock.mockReturnValue(loggedOut);
    render(<Header />);
    expect(screen.queryByRole("link", { name: /sign in/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /^join$/i })).toBeNull();
  });

  it("logged-out user on /members/signup does NOT see Sign In or Join", () => {
    pathname = "/members/signup";
    useAuthMock.mockReturnValue(loggedOut);
    render(<Header />);
    expect(screen.queryByRole("link", { name: /sign in/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /^join$/i })).toBeNull();
  });

  it("logged-out user on /members/dashboard still sees Sign In and Join (suppression scoped to auth pages only)", () => {
    pathname = "/members/dashboard";
    useAuthMock.mockReturnValue(loggedOut);
    render(<Header />);
    expect(screen.getAllByRole("link", { name: /sign in/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /^join$/i }).length).toBeGreaterThan(0);
  });

  it("logged-in user sees AccountMenu trigger, not a standalone Dashboard link in the desktop nav", () => {
    useAuthMock.mockReturnValue(loggedIn);
    render(<Header />);
    expect(screen.getByRole("button", { name: /account menu/i })).toBeInTheDocument();
    const dashboardLinks = screen.queryAllByRole("link", { name: /^dashboard$/i });
    expect(dashboardLinks.length).toBe(0);
  });

  it("logged-in user does not see Sign In or Join", () => {
    useAuthMock.mockReturnValue(loggedIn);
    render(<Header />);
    expect(screen.queryByRole("link", { name: /sign in/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /^join$/i })).toBeNull();
  });

  it("loading state renders neither auth branch (no Sign In, no AccountMenu)", () => {
    useAuthMock.mockReturnValue(loading);
    render(<Header />);
    expect(screen.queryByRole("link", { name: /sign in/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /account menu/i })).toBeNull();
  });
});
```

- [ ] **Step 2.2: Run the test and confirm failures**

```bash
npm run test:run -- src/components/landing/__tests__/Header.test.tsx
```

Expected: the pre-existing Join test still passes; new tests fail with various mismatches (AccountMenu not present, Sign In still visible on auth pages).

- [ ] **Step 2.3: Modify `Header.tsx` to import `usePathname` and `AccountMenu`**

Edit `src/components/landing/Header.tsx`. Update the imports block at the top:

Replace:

```tsx
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "@/context/AuthContext";
import { isAdmin } from "@/lib/admin";
import { Menu, X } from "lucide-react";
```

With:

```tsx
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "@/context/AuthContext";
import { isAdmin } from "@/lib/admin";
import { Menu, X } from "lucide-react";
import { AccountMenu } from "./AccountMenu";
```

- [ ] **Step 2.4: Add pathname-based auth-CTA suppression flag inside the Header function body**

Inside the `Header` function, immediately after the existing `const { user, loading } = useAuth();` line and the `const showAdmin = ...` line, add:

```tsx
const pathname = usePathname();
const suppressAuthCTAs = pathname === "/members/login" || pathname === "/members/signup";
```

So the top of the function reads:

```tsx
export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, loading } = useAuth();
  const showAdmin = !loading && user && isAdmin(user.email ?? undefined);
  const pathname = usePathname();
  const suppressAuthCTAs = pathname === "/members/login" || pathname === "/members/signup";
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  // ... rest unchanged
```

- [ ] **Step 2.5: Replace the desktop auth branch (lines 70-102) with AccountMenu + suppression**

In the **desktop nav** block, replace the existing auth conditional:

```tsx
            {loading ? null : user ? (
              <>
                {showAdmin && (
                  <Link
                    href="/admin"
                    className="text-optical-white/80 hover:text-optical-white transition-colors text-sm"
                  >
                    Admin
                  </Link>
                )}
                <Link
                  href="/members/dashboard"
                  className="text-sm px-4 py-2 rounded-sm bg-brass text-charcoal hover:bg-brass-muted transition-colors"
                >
                  Dashboard
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/members/login"
                  className="text-optical-white/80 hover:text-optical-white transition-colors text-sm"
                >
                  Sign In
                </Link>
                <Link
                  href="/membership"
                  className="text-sm px-4 py-2 rounded-sm bg-brass text-charcoal hover:bg-brass-muted transition-colors"
                >
                  Join
                </Link>
              </>
            )}
```

With:

```tsx
            {loading ? null : user ? (
              <AccountMenu />
            ) : suppressAuthCTAs ? null : (
              <>
                <Link
                  href="/members/login"
                  className="text-optical-white/80 hover:text-optical-white transition-colors text-sm"
                >
                  Sign In
                </Link>
                <Link
                  href="/membership"
                  className="text-sm px-4 py-2 rounded-sm bg-brass text-charcoal hover:bg-brass-muted transition-colors"
                >
                  Join
                </Link>
              </>
            )}
```

(The Admin link disappears from the desktop nav because it now lives inside the AccountMenu dropdown. This matches the design — AccountMenu is the home for all account-related affordances on desktop.)

- [ ] **Step 2.6: Replace the mobile auth branch (lines 147-183) with inline items + suppression**

In the **mobile menu** block, replace the existing auth conditional:

```tsx
                {loading ? null : user ? (
                  <>
                    {showAdmin && (
                      <Link
                        href="/admin"
                        className="block text-optical-white/80 hover:text-optical-white py-3"
                        onClick={() => setMobileOpen(false)}
                      >
                        Admin
                      </Link>
                    )}
                    <Link
                      href="/members/dashboard"
                      className="block text-brass-text hover:text-brass-muted py-3"
                      onClick={() => setMobileOpen(false)}
                    >
                      Dashboard
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href="/members/login"
                      className="block text-optical-white/80 hover:text-optical-white py-3"
                      onClick={() => setMobileOpen(false)}
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/membership"
                      className="block text-brass-text hover:text-brass-muted py-3"
                      onClick={() => setMobileOpen(false)}
                    >
                      Join
                    </Link>
                  </>
                )}
```

With:

```tsx
                {loading ? null : user ? (
                  <MobileAccountSection
                    showAdmin={!!showAdmin}
                    onItemClick={() => setMobileOpen(false)}
                  />
                ) : suppressAuthCTAs ? null : (
                  <>
                    <Link
                      href="/members/login"
                      className="block text-optical-white/80 hover:text-optical-white py-3"
                      onClick={() => setMobileOpen(false)}
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/membership"
                      className="block text-brass-text hover:text-brass-muted py-3"
                      onClick={() => setMobileOpen(false)}
                    >
                      Join
                    </Link>
                  </>
                )}
```

- [ ] **Step 2.7: Add the `MobileAccountSection` helper to `Header.tsx`**

At the bottom of `Header.tsx` (after the closing brace of `Header`), add:

```tsx
function MobileAccountSection({
  showAdmin,
  onItemClick,
}: {
  showAdmin: boolean;
  onItemClick: () => void;
}) {
  const { signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    onItemClick();
    try {
      await signOut();
      toast.success("Signed out");
      router.push("/");
    } catch {
      toast.error("Sign out failed. Try again.");
    }
  };

  return (
    <>
      <Link
        href="/members/dashboard"
        className="block text-brass-text hover:text-brass-muted py-3"
        onClick={onItemClick}
      >
        Dashboard
      </Link>
      <Link
        href="/members/settings"
        className="block text-optical-white/80 hover:text-optical-white py-3"
        onClick={onItemClick}
      >
        Settings
      </Link>
      {showAdmin && (
        <Link
          href="/admin"
          className="block text-optical-white/80 hover:text-optical-white py-3"
          onClick={onItemClick}
        >
          Admin
        </Link>
      )}
      <button
        type="button"
        onClick={handleSignOut}
        className="block w-full text-left text-optical-white/80 hover:text-optical-white py-3"
      >
        Sign Out
      </button>
    </>
  );
}
```

And add the imports at the top to support this (alongside the existing ones):

```tsx
import { useRouter } from "next/navigation";
import { toast } from "sonner";
```

Combine with the existing `usePathname` import:

```tsx
import { usePathname, useRouter } from "next/navigation";
```

- [ ] **Step 2.8: Run the Header test and confirm pass**

```bash
npm run test:run -- src/components/landing/__tests__/Header.test.tsx
```

Expected: all tests pass.

- [ ] **Step 2.9: Run the full test suite to check no regressions**

```bash
npm run test:run
```

Expected: all previously-passing tests still pass; new AccountMenu and Header tests pass.

- [ ] **Step 2.10: Commit**

```bash
git add src/components/landing/Header.tsx src/components/landing/__tests__/Header.test.tsx
git commit -m "feat(landing): wire AccountMenu into Header; suppress auth-page CTAs

Logged-in desktop nav now renders AccountMenu (popover with
Dashboard/Settings/Admin/Sign Out) instead of a standalone
Dashboard button. Mobile menu inlines the same items plus a
Sign Out button. Sign In / Join are hidden on /members/login
and /members/signup."
```

---

## Task 3: Add Header+Footer to `members/layout`; strip dashboard's bespoke header (combined commit to avoid double-header window)

**Files:**
- Modify: `src/app/members/layout.tsx`
- Modify: `src/app/members/dashboard/page.tsx`
- Create: `src/app/members/__tests__/layout.test.tsx`
- Create: `src/app/members/dashboard/__tests__/page.test.tsx`

**Why combined:** if `members/layout.tsx` ships with Header first and dashboard's bespoke header still exists, `/members/dashboard` renders two stacked headers. Combine to keep every commit shippable.

- [ ] **Step 3.1: Write the layout smoke test**

Create `src/app/members/__tests__/layout.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@/test/test-utils";
import MembersLayout from "../layout";

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ user: null, loading: false, signOut: vi.fn() }),
}));

vi.mock("@/lib/admin", () => ({ isAdmin: () => false }));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("members/layout", () => {
  it("renders Header, children, and Footer", () => {
    render(
      <MembersLayout>
        <p data-testid="child">members child</p>
      </MembersLayout>,
    );
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });
});
```

(Header is a `<header>` element → `role="banner"`. Footer is a `<footer>` element → `role="contentinfo"`. Verify the Footer component actually uses `<footer>`; if it doesn't, swap the assertion to a text/test-id match against a known Footer string.)

- [ ] **Step 3.2: Write the dashboard regression test**

Create `src/app/members/dashboard/__tests__/page.test.tsx`. *(If a test file already exists at this path, extend rather than create.)*

```tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@/test/test-utils";
import MemberDashboard from "../page";

const useAuthMock = vi.fn();
const useMembershipMock = vi.fn();

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("@/hooks/useMembership", () => ({
  useMembership: () => useMembershipMock(),
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQuery: () => ({ data: [], isLoading: false }),
  };
});

describe("MemberDashboard — header cleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthMock.mockReturnValue({
      user: { email: "ada@example.com", user_metadata: { name: "Ada" } },
      loading: false,
      signOut: vi.fn(),
      supabase: { from: () => ({ select: () => ({ eq: () => ({ order: vi.fn() }) }) }) },
    });
    useMembershipMock.mockReturnValue({
      membership: null,
      isLoading: false,
      isMember: false,
    });
  });

  it("renders the body-level Welcome heading", () => {
    render(<MemberDashboard />);
    expect(
      screen.getByRole("heading", { level: 1, name: /welcome back, ada/i }),
    ).toBeInTheDocument();
  });

  it("does NOT render a bespoke Sign Out button (Sign Out now lives in AccountMenu)", () => {
    render(<MemberDashboard />);
    expect(screen.queryByRole("button", { name: /sign out/i })).toBeNull();
  });

  it("does NOT render a bespoke inline Settings link in the page chrome", () => {
    render(<MemberDashboard />);
    // The dashboard's inline chrome had a Settings link in its header bar.
    // After cleanup, no Settings link should exist on the page body itself.
    expect(screen.queryByRole("link", { name: /^settings$/i })).toBeNull();
  });
});
```

- [ ] **Step 3.3: Run both tests and confirm failure**

```bash
npm run test:run -- src/app/members/__tests__/layout.test.tsx src/app/members/dashboard/__tests__/page.test.tsx
```

Expected: layout test fails (Header/Footer not rendered); dashboard tests fail (Sign Out button still present, Settings link still present).

- [ ] **Step 3.4: Update `members/layout.tsx`**

Replace the entire contents of `src/app/members/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: {
    default: "Members",
    template: "%s | Butlers Inc.",
  },
};

export default function MembersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="pt-20">{children}</main>
      <Footer />
    </>
  );
}
```

- [ ] **Step 3.5: Remove bespoke header from `members/dashboard/page.tsx`**

In `src/app/members/dashboard/page.tsx`, delete the entire `<header>...</header>` block (lines 64-87 inclusive) and the `handleSignOut` function (lines 49-52) which is no longer referenced. Also remove `signOut` from the `useAuth()` destructure on line 31 since it's no longer used here.

Concrete edits:

Line 31 — change:

```tsx
  const { user, loading, signOut, supabase } = useAuth();
```

To:

```tsx
  const { user, loading, supabase } = useAuth();
```

Lines 49-52 — delete the `handleSignOut` function entirely.

Lines 64-87 — delete the entire `<header>...</header>` block.

After the changes, the return block should start with:

```tsx
  return (
    <div className="min-h-screen bg-charcoal">
      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Welcome + Tier */}
        <div className="flex items-center gap-3 mb-8">
          <h1 className="text-3xl font-serif font-bold text-optical-white tracking-tight">
            Welcome back, {user?.user_metadata?.name ?? "Member"}
          </h1>
          {isMember && membership && <TierBadge tier={membership.tier.slug} size="lg" />}
        </div>
        {/* ...unchanged from here down... */}
      </main>
    </div>
  );
```

Note: the inner `<main>` here lives *inside* the page; the outer `<main className="pt-20">` from the layout still wraps it. Nested `<main>` is invalid HTML — change the inner `<main>` to a `<div>`:

```tsx
      <div className="max-w-4xl mx-auto px-6 py-12">
```

And update the closing tag from `</main>` to `</div>` accordingly.

- [ ] **Step 3.6: Run the tests and confirm pass**

```bash
npm run test:run -- src/app/members/__tests__/layout.test.tsx src/app/members/dashboard/__tests__/page.test.tsx
```

Expected: all pass.

- [ ] **Step 3.7: Run full test suite for regressions**

```bash
npm run test:run
```

Expected: all pass.

- [ ] **Step 3.8: Commit**

```bash
git add src/app/members/layout.tsx src/app/members/dashboard/page.tsx src/app/members/__tests__/layout.test.tsx src/app/members/dashboard/__tests__/page.test.tsx
git commit -m "feat(members): inject global Header+Footer; remove dashboard's bespoke header

Members layout now wraps children with Header (pt-20 spacer for
fixed positioning) and Footer. Dashboard's inline header bar
(logo + welcome + Settings + Sign Out) is removed since Sign Out
lives in the global AccountMenu and the body already had a
Welcome heading."
```

---

## Task 4: Settings — remove `← Back to Dashboard` link

**Files:**
- Modify: `src/app/members/settings/page.tsx`

- [ ] **Step 4.1: Delete the Back nav block from `settings/page.tsx`**

In `src/app/members/settings/page.tsx`, delete lines 137-143 (the `{/* Back nav */}` comment and the `<Link href="/members/dashboard">...</Link>`):

Remove:

```tsx
        {/* Back nav */}
        <Link
          href="/members/dashboard"
          className="text-warm-gray text-sm hover:text-optical-white transition-colors mb-6 inline-block"
        >
          &larr; Back to Dashboard
        </Link>
```

The `<h1>` "Account Settings" immediately following it becomes the first content under the layout's `<main>`.

If after this deletion `Link` is no longer imported by anything in the file, remove the `import Link from "next/link"` line. (Verify with a quick grep before removing.)

- [ ] **Step 4.2: Run the test suite to check for regressions**

```bash
npm run test:run
```

Expected: all pass.

- [ ] **Step 4.3: Commit**

```bash
git add src/app/members/settings/page.tsx
git commit -m "refactor(members/settings): remove inline back link

Global Header (added in previous commit) provides navigation."
```

---

## Task 5: Personal Butler — remove `← Back to Dashboard` link

**Files:**
- Modify: `src/app/members/personal-butler/page.tsx`

- [ ] **Step 5.1: Delete the Back nav block**

In `src/app/members/personal-butler/page.tsx`, delete lines 39-45:

Remove:

```tsx
        {/* Back nav */}
        <Link
          href="/members/dashboard"
          className="text-warm-gray text-sm hover:text-optical-white transition-colors mb-6 inline-block"
        >
          &larr; Back to Dashboard
        </Link>
```

If `Link` is no longer used elsewhere in this file, also remove the `import Link from "next/link"` line. (Grep first.)

- [ ] **Step 5.2: Run the test suite**

```bash
npm run test:run
```

Expected: all pass.

- [ ] **Step 5.3: Commit**

```bash
git add src/app/members/personal-butler/page.tsx
git commit -m "refactor(members/personal-butler): remove inline back link

Global Header provides navigation."
```

---

## Task 6: Virtual Butler — remove `← Back to Dashboard` link

**Files:**
- Modify: `src/app/members/virtual-butler/page.tsx`

- [ ] **Step 6.1: Delete the Back nav block**

In `src/app/members/virtual-butler/page.tsx`, delete lines 105-111:

Remove:

```tsx
        {/* Back nav */}
        <Link
          href="/members/dashboard"
          className="text-warm-gray text-sm hover:text-optical-white transition-colors mb-6 inline-block"
        >
          &larr; Back to Dashboard
        </Link>
```

If `Link` is no longer used elsewhere in this file, also remove the `import Link from "next/link"` line. (Grep first.)

- [ ] **Step 6.2: Run the test suite**

```bash
npm run test:run
```

Expected: all pass.

- [ ] **Step 6.3: Commit**

```bash
git add src/app/members/virtual-butler/page.tsx
git commit -m "refactor(members/virtual-butler): remove inline back link

Global Header provides navigation."
```

---

## Task 7: Membership — create `membership/layout.tsx` with Header + Footer

**Files:**
- Create: `src/app/membership/layout.tsx`
- Create: `src/app/membership/__tests__/layout.test.tsx`

- [ ] **Step 7.1: Write the layout smoke test**

Create `src/app/membership/__tests__/layout.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@/test/test-utils";
import MembershipLayout from "../layout";

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ user: null, loading: false, signOut: vi.fn() }),
}));

vi.mock("@/lib/admin", () => ({ isAdmin: () => false }));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("membership/layout", () => {
  it("renders Header, children, and Footer", () => {
    render(
      <MembershipLayout>
        <p data-testid="child">membership child</p>
      </MembershipLayout>,
    );
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });
});
```

- [ ] **Step 7.2: Run the test and confirm failure**

```bash
npm run test:run -- src/app/membership/__tests__/layout.test.tsx
```

Expected: fail with "Cannot find module '../layout'".

- [ ] **Step 7.3: Create `membership/layout.tsx`**

Create `src/app/membership/layout.tsx`:

```tsx
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";

export default function MembershipLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="pt-20">{children}</main>
      <Footer />
    </>
  );
}
```

- [ ] **Step 7.4: Run the test and confirm pass**

```bash
npm run test:run -- src/app/membership/__tests__/layout.test.tsx
```

Expected: pass.

- [ ] **Step 7.5: Run the full test suite for regressions**

```bash
npm run test:run
```

Expected: all pass.

- [ ] **Step 7.6: Commit**

```bash
git add src/app/membership/layout.tsx src/app/membership/__tests__/layout.test.tsx
git commit -m "feat(membership): add layout with global Header+Footer"
```

---

## Task 8: Booking confirmation — create `booking-confirmation/layout.tsx` with Header + Footer

**Files:**
- Create: `src/app/booking-confirmation/layout.tsx`
- Create: `src/app/booking-confirmation/__tests__/layout.test.tsx`

- [ ] **Step 8.1: Write the layout smoke test**

Create `src/app/booking-confirmation/__tests__/layout.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@/test/test-utils";
import BookingConfirmationLayout from "../layout";

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ user: null, loading: false, signOut: vi.fn() }),
}));

vi.mock("@/lib/admin", () => ({ isAdmin: () => false }));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("booking-confirmation/layout", () => {
  it("renders Header, children, and Footer", () => {
    render(
      <BookingConfirmationLayout>
        <p data-testid="child">confirmation child</p>
      </BookingConfirmationLayout>,
    );
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });
});
```

- [ ] **Step 8.2: Run the test and confirm failure**

```bash
npm run test:run -- src/app/booking-confirmation/__tests__/layout.test.tsx
```

Expected: fail with "Cannot find module '../layout'".

- [ ] **Step 8.3: Create `booking-confirmation/layout.tsx`**

Create `src/app/booking-confirmation/layout.tsx`:

```tsx
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";

export default function BookingConfirmationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="pt-20">{children}</main>
      <Footer />
    </>
  );
}
```

- [ ] **Step 8.4: Run the test and confirm pass**

```bash
npm run test:run -- src/app/booking-confirmation/__tests__/layout.test.tsx
```

Expected: pass.

- [ ] **Step 8.5: Run the full test suite for regressions**

```bash
npm run test:run
```

Expected: all pass.

- [ ] **Step 8.6: Commit**

```bash
git add src/app/booking-confirmation/layout.tsx src/app/booking-confirmation/__tests__/layout.test.tsx
git commit -m "feat(booking-confirmation): add layout with global Header+Footer"
```

---

## Task 9: Manual QA pass + lint + build

**Files:** none (verification only).

- [ ] **Step 9.1: Lint**

```bash
npm run lint
```

Expected: no errors. Fix any new warnings introduced by the diff (unused imports are the most likely thing — verify the `Link` imports were removed from settings/personal-butler/virtual-butler if no longer used).

- [ ] **Step 9.2: Build**

```bash
npm run build
```

Expected: clean build, no TypeScript errors.

- [ ] **Step 9.3: Start dev server**

```bash
npm run dev
```

Leave running in a terminal.

- [ ] **Step 9.4: Walk every affected route in a browser, logged-in (use a test account or sign up fresh)**

For each of these URLs, verify the Header is visible at the top, the Footer is visible at the bottom, and content is not hidden behind the Header:

- `/` (homepage — no regression)
- `/butlers` (no regression)
- `/membership`
- `/booking-confirmation` (trigger by completing a booking flow OR visit directly with a reference query param if the page allows)
- `/members/dashboard`
- `/members/settings`
- `/members/personal-butler`
- `/members/virtual-butler`
- `/members/checkout/success` (trigger by completing a membership checkout)

- [ ] **Step 9.5: Sign-out flow check**

From `/members/dashboard`:
1. Click the AccountMenu trigger (circle with initials in the Header).
2. Verify the dropdown shows Dashboard, Settings, Sign Out (plus Admin if admin).
3. Click Sign Out.
4. Verify a "Signed out" toast appears and the browser navigates to `/`.

- [ ] **Step 9.6: Auth-page CTA suppression**

Sign out, then visit:
- `/members/login` — verify the Header shows logo + Home + Our Butlers, but **no** Sign In or Join buttons.
- `/members/signup` — same.

Then visit `/` — verify Sign In + Join are visible again (regression check that suppression is scoped correctly).

- [ ] **Step 9.7: Mobile menu**

Resize the browser below `md` breakpoint (~768px). On `/members/dashboard` while signed in:
1. Open the hamburger.
2. Verify Dashboard, Settings, Sign Out (and Admin if admin) appear as inline items.
3. Tap Sign Out — verify toast + navigation to `/`.

On `/members/login` while signed out, open hamburger — verify Sign In + Join are absent.

- [ ] **Step 9.8: Keyboard navigation**

On any logged-in page:
1. Tab through the Header until focus lands on the AccountMenu trigger (the circular initials button).
2. Press Enter to open the menu.
3. Press ArrowDown — focus moves to Dashboard.
4. Press ArrowDown again — focus moves to Settings. Continue cycling.
5. Press ArrowUp from Dashboard — focus wraps to Sign Out.
6. Press Escape — menu closes, focus returns to the trigger.

- [ ] **Step 9.9: No auth-loading flicker**

Refresh `/members/dashboard` while signed in. Verify there is no visible flash of "Sign In" / "Join" CTAs before the AccountMenu appears. (Brief absence of both is OK; visible flash of the wrong CTAs is not.)

- [ ] **Step 9.10: Open the PR**

If everything above passes:

```bash
git push -u origin nav/global-header-coverage
gh pr create --base staging --title "Global Header + Footer coverage on logged-in routes" --body "$(cat <<'EOF'
## Summary
- Adds global Header + Footer to /members, /membership, /booking-confirmation via per-segment layouts.
- New AccountMenu component (Dashboard / Settings / Admin / Sign Out) replaces the standalone Dashboard button in Header for logged-in users.
- Suppresses Sign In / Join CTAs on /members/login and /members/signup.
- Removes bespoke inline header from /members/dashboard and "← Back to Dashboard" links from settings, personal-butler, and virtual-butler.

Spec: docs/superpowers/specs/2026-05-25-logged-in-navigation-coverage-design.md

## Test plan
- [x] Vitest unit + layout smoke tests pass (`npm run test:run`)
- [x] Build succeeds (`npm run build`)
- [x] Manual QA: every internal route shows Header + Footer; no content hidden behind fixed Header
- [x] Sign Out works from desktop AccountMenu and mobile menu
- [x] Sign In / Join hidden on /members/login and /members/signup
- [x] Keyboard nav: Tab to AccountMenu, Enter opens, ArrowDown/ArrowUp cycles, Escape closes

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Note: PR opens against `staging`, not `main`, per project convention.

---

## Self-review checklist (already run; recorded here for the executor)

- **Spec coverage:** all 7 spec decisions implemented across Tasks 1-8. The dashboard "Welcome back" demotion is moot because the body already has a `<h1>` with that text (line 92-94) — Task 3 only removes the inline chrome.
- **Placeholders:** none. Every step has full code or an exact command.
- **Type consistency:** `AccountMenu` is imported by `Header.tsx` in Task 2; component name and export match (`export function AccountMenu`). `MobileAccountSection` is local to `Header.tsx`. `signOut` signature comes from `AuthContext` (`() => Promise<void>`, verified at `src/context/AuthContext.tsx:31`).
- **Sub-project #2 not bundled:** the dashboard "Book a Butler" CTA bug (`/` → `/members/personal-butler`) is intentionally *not* in this plan per user's earlier decision to ship as a separate small PR. Add a follow-up task in your tracker if not already there.
- **`Footer` role check:** Task 3.1 assumes `<Footer />` renders a `<footer>` element. If it doesn't, the smoke tests need a different matcher (e.g., `screen.getByText(/some footer label/i)`). Quick verify before running Task 3.1 by reading `src/components/landing/Footer.tsx`.
