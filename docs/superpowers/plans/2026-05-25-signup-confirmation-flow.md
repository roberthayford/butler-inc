# Signup Confirmation Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the post-signup toast with a dedicated `/members/signup/check-email` page (server component) + `ResendVerificationButton` client island. Preserves the `?next=` flow through the verification redirect chain. Extends Header CTA suppression to the new path.

**Architecture:** Next 16 App Router. Async server-component page reads `email` and `next` from `searchParams` (Promise). Static content is bundled by the server; the only client JS is the resend button. Supabase `auth.resend({ type: "signup", email })` is called directly from the browser via the shared `@/lib/supabase/client` `createClient()` instance.

**Tech Stack:** Next.js 16, React 19, Tailwind v4, Supabase Auth via `@supabase/ssr` `createBrowserClient`, Vitest + Testing Library, sonner for toasts.

**Spec:** [`docs/superpowers/specs/2026-05-25-signup-confirmation-flow-design.md`](../specs/2026-05-25-signup-confirmation-flow-design.md) (commit `3b40559`).

**Branch convention:** create a feature branch off `staging`. No merges to `main` without explicit user approval.

---

## Task ordering rationale

1. **Header refactor first** — small, isolated change. Extracts `AUTH_PAGE_PATHS` constant set and adds the new path. Closes M-3 from the previous PR's cross-cutting review.
2. **ResendVerificationButton** — built in isolation with TDD before the page consumes it. No regression risk.
3. **check-email page** — uses ResendVerificationButton from Task 2. Page exists before any signup tries to navigate to it.
4. **SignupPage redirect update** — only ships *after* check-email exists. Avoids a window where new signups would 404. Updates the existing signup test to assert the new navigation target.
5. **Manual QA + lint + build** — verification gate before the PR.

Each task is internally consistent (test + impl + commit). Bisect-safe.

---

## File structure

**Created:**
- `src/components/auth/ResendVerificationButton.tsx` — new client component (directory `src/components/auth/` does not yet exist; create it)
- `src/components/auth/__tests__/ResendVerificationButton.test.tsx`
- `src/app/members/signup/check-email/page.tsx` — new async server component
- `src/app/members/signup/check-email/__tests__/page.test.tsx`

**Modified:**
- `src/components/landing/Header.tsx` — extract `AUTH_PAGE_PATHS` set; add `/members/signup/check-email` to it
- `src/components/landing/__tests__/Header.test.tsx` — add suppression test for new path
- `src/app/members/signup/SignupPage.tsx` — replace `toast.success(...)` + `router.push("/members/login")` (lines 54-55) with navigation to `/members/signup/check-email?email=…[&next=…]`
- `src/app/members/__tests__/signup.test.tsx` — update navigation-target assertion

**Untouched (verified during planning):**
- `src/lib/supabase/client.ts` — `createClient()` already returns a `createBrowserClient` instance
- `src/app/auth/callback/route.ts` — already honours `?next=` query param
- `src/app/members/layout.tsx` — provides Header + Footer; check-email page inherits it
- `src/context/AuthContext.tsx` — unchanged

---

## Pre-flight

- [ ] **Step 0.1: Create feature branch off `staging`**

```bash
git checkout staging
git pull --ff-only
git checkout -b auth/signup-check-email
```

- [ ] **Step 0.2: Verify clean working tree and test baseline**

```bash
git status
npm run test:run
```

Expected: clean tree; all existing tests pass.

---

## Task 1: Header — extract `AUTH_PAGE_PATHS` set; add `/members/signup/check-email` to suppression

**Files:**
- Modify: `src/components/landing/Header.tsx`
- Modify: `src/components/landing/__tests__/Header.test.tsx`

**Why first:** small isolated refactor, closes M-3 from prior review, sets foundation for the new page's chrome.

- [ ] **Step 1.1: Add the new suppression test to Header.test.tsx**

In `src/components/landing/__tests__/Header.test.tsx`, after the existing `"logged-out user on /members/signup does NOT see Sign In or Join"` test, add:

```tsx
  it("logged-out user on /members/signup/check-email does NOT see Sign In or Join", () => {
    pathnameRef.current = "/members/signup/check-email";
    useAuthMock.mockReturnValue(loggedOut);
    render(<Header />);
    expect(screen.queryByRole("link", { name: /sign in/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /^join$/i })).toBeNull();
  });
```

- [ ] **Step 1.2: Run the test and confirm failure**

```bash
npm run test:run -- src/components/landing/__tests__/Header.test.tsx
```

Expected: 9 tests run; the new one fails because the Header's literal pathname check doesn't include `/members/signup/check-email`. Other 8 still pass.

- [ ] **Step 1.3: Extract `AUTH_PAGE_PATHS` set in `Header.tsx`**

In `src/components/landing/Header.tsx`, at module scope (above the `Header` function), add:

```tsx
const AUTH_PAGE_PATHS: ReadonlySet<string> = new Set([
  "/members/login",
  "/members/signup",
  "/members/signup/check-email",
]);
```

Then inside the `Header` function, replace this line:

```tsx
  const suppressAuthCTAs = pathname === "/members/login" || pathname === "/members/signup";
```

With:

```tsx
  const suppressAuthCTAs = AUTH_PAGE_PATHS.has(pathname);
```

- [ ] **Step 1.4: Run the Header test and confirm all pass**

```bash
npm run test:run -- src/components/landing/__tests__/Header.test.tsx
```

Expected: 9/9 pass.

- [ ] **Step 1.5: Run the full test suite for regressions**

```bash
npm run test:run
```

Expected: full suite green (no regressions).

- [ ] **Step 1.6: Commit**

```bash
git add src/components/landing/Header.tsx src/components/landing/__tests__/Header.test.tsx
git commit -m "refactor(landing): extract AUTH_PAGE_PATHS; include /signup/check-email

Moves the literal pathname-equality check for auth-page CTA
suppression into a module-level ReadonlySet so the list is
self-documenting and extensible. Adds the upcoming
/members/signup/check-email path to the set."
```

---

## Task 2: Build `ResendVerificationButton` (TDD)

**Files:**
- Create: `src/components/auth/ResendVerificationButton.tsx` (also creates `src/components/auth/` directory)
- Create: `src/components/auth/__tests__/ResendVerificationButton.test.tsx`

**Behaviour contract (from spec):**
- Renders nothing when `email` is null
- Default label `Resend verification email`
- Click calls `supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: … } })`
- Success: `toast.success("Verification email sent")` + 30s cooldown
- Cooldown label `Resend in {n}s`, button disabled
- Supabase error: `toast.error(<supabase message verbatim>)`; no cooldown
- Network failure: `toast.error("Couldn't resend right now. Please try again.")`; no cooldown
- `next` prop appended to `emailRedirectTo` as `?next=…`

- [ ] **Step 2.1: Create the auth components directory**

```bash
mkdir -p src/components/auth/__tests__
```

- [ ] **Step 2.2: Write the failing test file**

Create `src/components/auth/__tests__/ResendVerificationButton.test.tsx`:

```tsx
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@/test/test-utils";
import { ResendVerificationButton } from "../ResendVerificationButton";

const { mockResend, toastSuccess, toastError } = vi.hoisted(() => ({
  mockResend: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { resend: mockResend },
  }),
}));

vi.mock("sonner", () => ({
  toast: { success: toastSuccess, error: toastError },
}));

const ORIGINAL_LOCATION = window.location;

describe("ResendVerificationButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResend.mockResolvedValue({ data: {}, error: null });
    Object.defineProperty(window, "location", {
      writable: true,
      value: { ...ORIGINAL_LOCATION, origin: "https://example.test" },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(window, "location", {
      writable: true,
      value: ORIGINAL_LOCATION,
    });
  });

  it("renders nothing when email is null", () => {
    const { container } = render(
      <ResendVerificationButton email={null} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the default label when idle", () => {
    render(<ResendVerificationButton email="ada@example.com" />);
    expect(
      screen.getByRole("button", { name: /resend verification email/i }),
    ).toBeInTheDocument();
  });

  it("click calls supabase.auth.resend with type=signup, email, and emailRedirectTo", async () => {
    render(<ResendVerificationButton email="ada@example.com" />);
    fireEvent.click(
      screen.getByRole("button", { name: /resend verification email/i }),
    );
    await waitFor(() => expect(mockResend).toHaveBeenCalledTimes(1));
    expect(mockResend).toHaveBeenCalledWith({
      type: "signup",
      email: "ada@example.com",
      options: {
        emailRedirectTo: "https://example.test/auth/callback",
      },
    });
  });

  it("appends ?next= to emailRedirectTo when next prop is provided", async () => {
    render(
      <ResendVerificationButton
        email="ada@example.com"
        next="/membership/checkout/lite"
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /resend verification email/i }),
    );
    await waitFor(() => expect(mockResend).toHaveBeenCalledTimes(1));
    expect(mockResend.mock.calls[0][0].options.emailRedirectTo).toBe(
      "https://example.test/auth/callback?next=%2Fmembership%2Fcheckout%2Flite",
    );
  });

  it("success: toasts success message and starts cooldown", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<ResendVerificationButton email="ada@example.com" />);
    fireEvent.click(
      screen.getByRole("button", { name: /resend verification email/i }),
    );
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith("Verification email sent"));
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent(/resend in 30s/i);
  });

  it("cooldown ticks down each second", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<ResendVerificationButton email="ada@example.com" />);
    fireEvent.click(
      screen.getByRole("button", { name: /resend verification email/i }),
    );
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByRole("button")).toHaveTextContent(/resend in 25s/i);
  });

  it("cooldown ends after 30s; button re-enables", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<ResendVerificationButton email="ada@example.com" />);
    fireEvent.click(
      screen.getByRole("button", { name: /resend verification email/i }),
    );
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });
    const button = screen.getByRole("button");
    expect(button).not.toBeDisabled();
    expect(button).toHaveTextContent(/resend verification email/i);
  });

  it("supabase error: toasts the supabase message verbatim and does NOT start cooldown", async () => {
    mockResend.mockResolvedValueOnce({
      data: null,
      error: { message: "For security purposes, you can only request this once every 60 seconds" },
    });
    render(<ResendVerificationButton email="ada@example.com" />);
    fireEvent.click(
      screen.getByRole("button", { name: /resend verification email/i }),
    );
    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(
        "For security purposes, you can only request this once every 60 seconds",
      ),
    );
    expect(toastSuccess).not.toHaveBeenCalled();
    expect(screen.getByRole("button")).not.toBeDisabled();
  });

  it("network failure: toasts a generic message and does NOT start cooldown", async () => {
    mockResend.mockRejectedValueOnce(new Error("network down"));
    render(<ResendVerificationButton email="ada@example.com" />);
    fireEvent.click(
      screen.getByRole("button", { name: /resend verification email/i }),
    );
    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(
        "Couldn't resend right now. Please try again.",
      ),
    );
    expect(toastSuccess).not.toHaveBeenCalled();
    expect(screen.getByRole("button")).not.toBeDisabled();
  });
});
```

- [ ] **Step 2.3: Run the test and confirm failure**

```bash
npm run test:run -- src/components/auth/__tests__/ResendVerificationButton.test.tsx
```

Expected: every test fails with "Cannot find module '../ResendVerificationButton'".

- [ ] **Step 2.4: Create the component**

Create `src/components/auth/ResendVerificationButton.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const COOLDOWN_MS = 30_000;

interface Props {
  email: string | null;
  next?: string | null;
}

export function ResendVerificationButton({ email, next }: Props) {
  const [cooldownEndsAt, setCooldownEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (cooldownEndsAt === null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [cooldownEndsAt]);

  useEffect(() => {
    if (cooldownEndsAt !== null && now >= cooldownEndsAt) {
      setCooldownEndsAt(null);
    }
  }, [cooldownEndsAt, now]);

  if (!email) return null;

  const remainingMs = cooldownEndsAt ? Math.max(0, cooldownEndsAt - now) : 0;
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const onCooldown = cooldownEndsAt !== null && remainingMs > 0;

  async function handleClick() {
    const supabase = createClient();
    const emailRedirectTo = next
      ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
      : `${window.location.origin}/auth/callback`;
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email!,
        options: { emailRedirectTo },
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Verification email sent");
      setCooldownEndsAt(Date.now() + COOLDOWN_MS);
    } catch {
      toast.error("Couldn't resend right now. Please try again.");
    }
  }

  return (
    <Button
      type="button"
      onClick={handleClick}
      disabled={onCooldown}
      className="w-full bg-brass text-charcoal hover:bg-brass-muted disabled:opacity-60"
    >
      {onCooldown ? `Resend in ${remainingSeconds}s` : "Resend verification email"}
    </Button>
  );
}
```

- [ ] **Step 2.5: Run the test and confirm all pass**

```bash
npm run test:run -- src/components/auth/__tests__/ResendVerificationButton.test.tsx
```

Expected: 9/9 pass.

- [ ] **Step 2.6: Run the full test suite for regressions**

```bash
npm run test:run
```

Expected: full suite green.

- [ ] **Step 2.7: Commit**

```bash
git add src/components/auth/ResendVerificationButton.tsx src/components/auth/__tests__/ResendVerificationButton.test.tsx
git commit -m "feat(auth): add ResendVerificationButton client island

Hand-rolled button that calls supabase.auth.resend with a 30s
client-side cooldown timer. Surfaces Supabase error messages
verbatim (including its 60s rate-limit message) and falls back
to a generic toast on network failure. Forwards an optional
next prop into the emailRedirectTo so the verification link's
landing page preserves the original signup destination.

Not yet consumed by any page."
```

---

## Task 3: Create `/members/signup/check-email` page (TDD, async server component)

**Files:**
- Create: `src/app/members/signup/check-email/page.tsx`
- Create: `src/app/members/signup/check-email/__tests__/page.test.tsx`

**Page contract (from spec):**
- Async server component; signature `({ searchParams }: { searchParams: Promise<{ email?: string | string[]; next?: string | string[] }> })`
- Reads first value if `email` is array; treats empty string as null
- Renders H1 `Check your email`
- Renders body with email if provided, generic if not
- Renders junk-folder callout
- Renders 3-step "what happens next" list
- Renders `<ResendVerificationButton email={email} next={next} />` (button hides itself if email is null)
- Renders "Wrong email? Start over" link to `/members/signup`
- Renders "Already verified? Sign in" link to `/members/login`

- [ ] **Step 3.1: Write the failing test file**

Create `src/app/members/signup/check-email/__tests__/page.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@/test/test-utils";
import Page from "../page";

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { resend: vi.fn() } }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

async function renderPage(searchParams: Record<string, string | string[] | undefined> = {}) {
  const ui = await Page({ searchParams: Promise.resolve(searchParams) });
  return render(ui);
}

describe("check-email page", () => {
  it("renders the H1 'Check your email'", async () => {
    await renderPage({ email: "ada@example.com" });
    expect(
      screen.getByRole("heading", { level: 1, name: /check your email/i }),
    ).toBeInTheDocument();
  });

  it("renders the supplied email in the body", async () => {
    await renderPage({ email: "ada@example.com" });
    expect(screen.getByText(/ada@example\.com/i)).toBeInTheDocument();
  });

  it("renders the generic body when email is missing and hides the resend button", async () => {
    await renderPage({});
    expect(
      screen.getByText(/email you signed up with/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /resend verification email/i }),
    ).toBeNull();
  });

  it("renders the resend button when email is provided", async () => {
    await renderPage({ email: "ada@example.com" });
    expect(
      screen.getByRole("button", { name: /resend verification email/i }),
    ).toBeInTheDocument();
  });

  it("renders the junk-folder callout", async () => {
    await renderPage({ email: "ada@example.com" });
    expect(
      screen.getByText(/junk or spam folder/i),
    ).toBeInTheDocument();
  });

  it("renders 'Wrong email? Start over' link to /members/signup", async () => {
    await renderPage({ email: "ada@example.com" });
    const link = screen.getByRole("link", { name: /wrong email\? start over/i });
    expect(link).toHaveAttribute("href", "/members/signup");
  });

  it("renders 'Already verified? Sign in' link to /members/login", async () => {
    await renderPage({ email: "ada@example.com" });
    const link = screen.getByRole("link", { name: /already verified\? sign in/i });
    expect(link).toHaveAttribute("href", "/members/login");
  });

  it("when email is an array, uses the first element", async () => {
    await renderPage({ email: ["first@example.com", "second@example.com"] });
    expect(screen.getByText(/first@example\.com/i)).toBeInTheDocument();
  });

  it("when email is empty string, falls back to generic body", async () => {
    await renderPage({ email: "" });
    expect(
      screen.getByText(/email you signed up with/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /resend verification email/i }),
    ).toBeNull();
  });
});
```

- [ ] **Step 3.2: Run the test and confirm failure**

```bash
npm run test:run -- src/app/members/signup/check-email/__tests__/page.test.tsx
```

Expected: every test fails with "Cannot find module '../page'".

- [ ] **Step 3.3: Create the page**

Create `src/app/members/signup/check-email/page.tsx`:

```tsx
import Link from "next/link";
import { ResendVerificationButton } from "@/components/auth/ResendVerificationButton";

function firstString(v: string | string[] | undefined): string | null {
  if (Array.isArray(v)) return v[0]?.trim() || null;
  if (typeof v === "string") return v.trim() || null;
  return null;
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ email?: string | string[]; next?: string | string[] }>;
}) {
  const sp = await searchParams;
  const email = firstString(sp.email);
  const next = firstString(sp.next);

  return (
    <div className="min-h-screen bg-charcoal flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="bg-primary-foreground/5 border border-primary-foreground/10 rounded-sm p-8 space-y-6">
          <h1 className="text-3xl font-serif font-bold text-optical-white tracking-tight text-center">
            Check your email
          </h1>

          <p className="text-warm-gray text-sm leading-relaxed text-center">
            {email ? (
              <>
                We sent a verification link to{" "}
                <span className="text-optical-white font-medium">{email}</span>.
                Click the link to activate your account.
              </>
            ) : (
              <>
                We sent a verification link to the email you signed up with.
                Click the link to activate your account.
              </>
            )}
          </p>

          <div className="bg-charcoal/40 border border-primary-foreground/10 rounded-sm p-4">
            <p className="text-warm-gray text-sm">
              Can&rsquo;t find it? Check your junk or spam folder.
            </p>
          </div>

          <ol className="text-warm-gray text-sm space-y-2 list-decimal list-inside">
            <li>Click the link in the email</li>
            <li>We&rsquo;ll sign you in automatically</li>
            <li>You&rsquo;ll land on your dashboard</li>
          </ol>

          <ResendVerificationButton email={email} next={next} />

          <div className="flex flex-col sm:flex-row sm:justify-between gap-3 pt-2 text-sm text-center">
            <Link
              href="/members/signup"
              className="text-warm-gray hover:text-optical-white transition-colors"
            >
              Wrong email? Start over
            </Link>
            <Link
              href="/members/login"
              className="text-brass-text hover:text-brass-muted transition-colors"
            >
              Already verified? Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3.4: Run the test and confirm all pass**

```bash
npm run test:run -- src/app/members/signup/check-email/__tests__/page.test.tsx
```

Expected: 9/9 pass.

- [ ] **Step 3.5: Run the full test suite for regressions**

```bash
npm run test:run
```

Expected: full suite green.

- [ ] **Step 3.6: Commit**

```bash
git add src/app/members/signup/check-email/page.tsx src/app/members/signup/check-email/__tests__/page.test.tsx
git commit -m "feat(signup): add /members/signup/check-email confirmation page

Async server component reads email and next from searchParams,
displays a clear 'check your email (including junk)' message
with a 'what happens next' explainer. Hosts the
ResendVerificationButton client island. Provides escape hatches
for users who mistyped their email or already verified in
another tab. Inherits Header+Footer from members/layout."
```

---

## Task 4: SignupPage — navigate to `/members/signup/check-email` instead of toast + login redirect

**Files:**
- Modify: `src/app/members/signup/SignupPage.tsx`
- Modify: `src/app/members/__tests__/signup.test.tsx`

**Why after Task 3:** check-email page must exist before any signup tries to navigate to it.

- [ ] **Step 4.1: Update the existing signup test to assert the new navigation target**

Open `src/app/members/__tests__/signup.test.tsx`. Replace the entire test body of `"redirects to ?next= after successful signup"` with this updated version (rename for accuracy), and add a second test for the no-`next` case:

Replace:

```tsx
  it("redirects to ?next= after successful signup", async () => {
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ ok: true }) } as Response));
    render(<SignupPage />);
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "Jane" } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "jane@example.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "supersecret" } });
    fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: "07123456789" } });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/membership/checkout/lite"));
  });
```

With:

```tsx
  it("after successful signup, navigates to /members/signup/check-email with email and next params", async () => {
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ ok: true }) } as Response));
    render(<SignupPage />);
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "Jane" } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "jane@example.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "supersecret" } });
    fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: "07123456789" } });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));
    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith(
        "/members/signup/check-email?email=jane%40example.com&next=%2Fmembership%2Fcheckout%2Flite",
      ),
    );
  });

  it("after successful signup with no next param, navigates to check-email with only email", async () => {
    vi.spyOn(navigation, "useSearchParams").mockReturnValue(
      new URLSearchParams("") as unknown as ReturnType<typeof navigation.useSearchParams>,
    );
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ ok: true }) } as Response));
    render(<SignupPage />);
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "Jane" } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "jane@example.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "supersecret" } });
    fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: "07123456789" } });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));
    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith(
        "/members/signup/check-email?email=jane%40example.com",
      ),
    );
  });
```

- [ ] **Step 4.2: Run the signup test and confirm failure**

```bash
npm run test:run -- src/app/members/__tests__/signup.test.tsx
```

Expected: both tests fail. The first because `mockPush` is called with `/membership/checkout/lite` (old behaviour), the second because it's called with `/members/login`.

- [ ] **Step 4.3: Modify `SignupPage.tsx`**

In `src/app/members/signup/SignupPage.tsx`, locate lines 54-55:

```tsx
    toast.success("Account created! Please check your email to verify.");
    router.push(next ?? "/members/login");
```

Replace both lines with:

```tsx
    const params = new URLSearchParams({ email: data.email });
    if (next) params.set("next", next);
    router.push(`/members/signup/check-email?${params.toString()}`);
```

Leave the `import { toast } from "sonner";` line at the top untouched — `toast.error(...)` is still used in the error path on line 50.

- [ ] **Step 4.4: Run the signup test and confirm pass**

```bash
npm run test:run -- src/app/members/__tests__/signup.test.tsx
```

Expected: 2/2 pass.

- [ ] **Step 4.5: Run the full test suite for regressions**

```bash
npm run test:run
```

Expected: full suite green.

- [ ] **Step 4.6: Commit**

```bash
git add src/app/members/signup/SignupPage.tsx src/app/members/__tests__/signup.test.tsx
git commit -m "feat(signup): redirect to /members/signup/check-email on success

Replaces the easily-missed sonner toast + immediate redirect to
login with a navigation to the dedicated check-email page,
passing email and (when present) next as query params. The
check-email page is the new persistent confirmation surface;
the toast disappeared too fast for many users to read it."
```

---

## Task 5: Manual QA + lint + build

**Files:** none (verification only).

- [ ] **Step 5.1: Lint**

```bash
npm run lint
```

Expected: no NEW errors. The 4 pre-existing errors on staging (AuthContext refs, membership-config any) are unchanged. Any new error in files this branch touched must be fixed before the PR.

- [ ] **Step 5.2: Build**

```bash
npm run build
```

Expected: clean build. New routes appear: `/members/signup/check-email`. No TypeScript errors.

- [ ] **Step 5.3: Start dev server**

```bash
npm run dev
```

Leave running for the browser checks below.

- [ ] **Step 5.4: Happy path — fresh signup with ?next=**

1. Open `http://localhost:3000/members/signup?next=/membership` in a private/incognito window.
2. Fill the form with a real email you can check.
3. Submit.
4. Confirm: browser lands on `/members/signup/check-email?email=<your-email-encoded>&next=%2Fmembership`.
5. Confirm: H1 "Check your email", body shows your email address, junk-folder callout visible, 3-step list visible, "Resend verification email" button visible, both footer links visible.
6. Confirm: global Header is rendered with logo + Home + Our Butlers, NO Sign In / Join CTAs (suppression working).

- [ ] **Step 5.5: Resend flow**

1. On the same page, click "Resend verification email".
2. Confirm: sonner toast `"Verification email sent"` appears.
3. Confirm: button disables and changes to `Resend in 30s`, ticking down each second.
4. Try clicking again during cooldown — button is disabled, nothing happens.
5. Wait 30s. Confirm: button re-enables, label returns to `Resend verification email`.

- [ ] **Step 5.6: Verification link → preserves `next`**

1. Open the verification email Supabase sent in step 5.4.
2. Click the link.
3. Confirm: browser lands on `/membership` (the `next` value preserved through the full chain), not `/members/dashboard`.

- [ ] **Step 5.7: Happy path — fresh signup WITHOUT ?next=**

1. Repeat 5.4 with `/members/signup` (no `?next=`) and a different fresh email.
2. Confirm: lands on `/members/signup/check-email?email=…` (no `next` param in URL).
3. Click verification link.
4. Confirm: lands on `/members/dashboard` (default).

- [ ] **Step 5.8: Direct navigation with no params**

1. While signed out, visit `http://localhost:3000/members/signup/check-email` directly.
2. Confirm: page renders the generic body copy (`"We sent a verification link to the email you signed up with…"`), no crash, no resend button visible, both footer links visible.

- [ ] **Step 5.9: Already-verified flow**

1. Open `/members/signup/check-email?email=<an-email-already-verified>` directly.
2. Click "Resend verification email".
3. Confirm: an error toast appears with whatever message Supabase returns (e.g. "User already confirmed" or similar). Cooldown does NOT start; button remains enabled.
4. Click "Already verified? Sign in" — lands on `/members/login`.

- [ ] **Step 5.10: Mobile width sanity**

Resize browser below 768px. Visit `/members/signup/check-email?email=test@example.com`.
- Card stays readable; padding doesn't crush the text.
- Footer links wrap to two rows (the `sm:flex-row` breakpoint kicks in).
- Header hamburger works; menu shows logo + Home + Our Butlers, no Sign In / Join.

- [ ] **Step 5.11: Open the PR**

```bash
git push -u origin auth/signup-check-email
gh pr create --base staging --title "Signup confirmation flow with check-email page" --body "$(cat <<'EOF'
## Summary
- New /members/signup/check-email page (async server component) replaces the easily-missed post-signup toast with a persistent surface explaining what to do next (check email, including junk folder).
- New ResendVerificationButton client island with 30s cooldown; surfaces Supabase rate-limit messages verbatim.
- SignupPage now navigates to the new page instead of pushing to /members/login.
- Preserves the ?next= flow through the full verification chain (signup → check-email → emailRedirectTo → /auth/callback → final destination).
- Header AUTH_PAGE_PATHS refactored to a Set + includes the new path (closes M-3 from PR #25 cross-cutting review).

Spec: docs/superpowers/specs/2026-05-25-signup-confirmation-flow-design.md

## Test plan
- [x] All new + existing Vitest cases pass (Header 9/9, ResendVerificationButton 9/9, check-email page 9/9, signup 2/2, full suite green)
- [x] Build succeeds; /members/signup/check-email route generated
- [x] Manual QA: happy path with and without ?next=, resend flow with cooldown, direct navigation with no params, already-verified Supabase error path, mobile width
- [x] Header on /members/signup/check-email shows no Sign In / Join CTAs

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

PR opens against `staging` per project convention.

---

## Self-review checklist (already run; recorded here)

- **Spec coverage:**
  - Surface decision (dedicated page) — Task 3 ✓
  - Resend with 30s cooldown — Task 2 ✓
  - Server component + client island split — Tasks 2 + 3 ✓
  - Email passed via query string — Task 3 reads `searchParams.email` ✓
  - `next` propagation through entire chain — Task 2 (ResendButton accepts + forwards `next`), Task 3 (page passes prop), Task 4 (SignupPage appends to URL) ✓
  - Header CTA suppression extended — Task 1 ✓
  - No verification detection — Task 3 passive page ✓
  - All copy specified — Task 3 page contents match spec table ✓
  - No new API routes / tables / schema — verified ✓
  - All edge cases (array searchParams, empty string, no email, no `next`, Supabase error, network error) — Tasks 2 + 3 ✓

- **Placeholders:** none. Every step contains exact code or commands.

- **Type consistency:**
  - `ResendVerificationButton` prop names (`email`, `next`) match across Tasks 2 + 3.
  - `AUTH_PAGE_PATHS` constant name matches between Task 1 implementation and references in Task 3's manual QA.
  - `firstString` helper in Task 3 is self-contained to that file; no cross-task type references.
  - `createClient()` import path (`@/lib/supabase/client`) consistent across Tasks 2 and 3 test files.

- **Manual QA gaps:** none — every spec edge case has a corresponding manual QA step in Task 5.
