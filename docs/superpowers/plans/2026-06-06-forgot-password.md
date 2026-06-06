# Forgot Password Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a self-serve password reset flow (request link → check email → set new password) for existing Supabase-authenticated users.

**Architecture:** A rate-limited `POST /api/members/password-reset` calls `supabase.auth.resetPasswordForEmail` with `redirectTo` pointing at the existing `/auth/callback` route (`?next=/members/reset-password`). The recovery link establishes a session via the unchanged callback; the new-password page then calls `supabase.auth.updateUser({ password })` and redirects to the dashboard. Three new pages mirror the existing signup flow; one link is added to the login page and three routes are added to the header's auth-suppression set.

**Tech Stack:** Next.js 16 App Router, React 19, Supabase (`@supabase/ssr`), react-hook-form + zod, shadcn/ui, sonner, Vitest + Testing Library.

**Conventions to honor:** Never use em dashes in customer-facing copy. Use `@/test/test-utils` for renders. Tests live at `src/**/__tests__/*.test.{ts,tsx}`. Run tests with `npm run test:run -- <pattern>`.

**Spec:** `docs/superpowers/specs/2026-06-06-forgot-password-design.md`

---

## File Structure

**Create:**
- `src/app/api/members/password-reset/route.ts` — POST handler (rate limit + resetPasswordForEmail, always 200)
- `src/app/api/members/password-reset/__tests__/route.test.ts`
- `src/app/members/forgot-password/page.tsx` — server wrapper (metadata)
- `src/app/members/forgot-password/ForgotPasswordPage.tsx` — client email-request form
- `src/app/members/forgot-password/__tests__/ForgotPasswordPage.test.tsx`
- `src/components/auth/ResendResetButton.tsx` — resend button (30s cooldown, re-POSTs the API route)
- `src/components/auth/__tests__/ResendResetButton.test.tsx`
- `src/app/members/forgot-password/check-email/page.tsx` — confirmation screen
- `src/app/members/forgot-password/check-email/__tests__/page.test.tsx`
- `src/app/members/reset-password/page.tsx` — server wrapper (metadata)
- `src/app/members/reset-password/ResetPasswordPage.tsx` — client new-password form (auth-guarded)
- `src/app/members/reset-password/__tests__/ResetPasswordPage.test.tsx`
- `src/app/members/login/__tests__/LoginPage.test.tsx` — covers the new "Forgot password?" link

**Modify:**
- `src/lib/rate-limit.ts` — add `passwordResetLimiter` instance
- `src/app/members/login/LoginPage.tsx` — add "Forgot password?" link
- `src/components/landing/Header.tsx` — add 3 routes to `AUTH_PAGE_PATHS`
- `src/components/landing/__tests__/Header.test.tsx` — suppression tests for the new routes

**Unchanged (verified sufficient):** `src/app/auth/callback/route.ts`, `src/context/AuthContext.tsx`, `src/lib/site-url.ts`, `src/lib/supabase/server.ts`.

---

## Task 1: Password-reset API route

**Files:**
- Modify: `src/lib/rate-limit.ts` (add one export at the end)
- Create: `src/app/api/members/password-reset/route.ts`
- Test: `src/app/api/members/password-reset/__tests__/route.test.ts`

- [ ] **Step 1: Add the rate limiter instance**

Append to `src/lib/rate-limit.ts` (after the existing `webhookLimiter` line):

```ts
export const passwordResetLimiter = new InMemoryRateLimiter({ maxRequests: 5, windowMs: 60_000 });
```

- [ ] **Step 2: Write the failing test**

Create `src/app/api/members/password-reset/__tests__/route.test.ts`:

```ts
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
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm run test:run -- password-reset/__tests__/route`
Expected: FAIL — `../route` cannot be resolved (route not created yet).

- [ ] **Step 4: Write the route**

Create `src/app/api/members/password-reset/route.ts`:

```ts
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { passwordResetLimiter } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";

const resetRequestSchema = z.object({
  email: z.string().email("Please enter a valid email"),
});

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limit = passwordResetLimiter.check(ip);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }

  const body = await request.json();
  const parsed = resetRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid email", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${getSiteUrl(request)}/auth/callback?next=/members/reset-password`,
  });

  // Never reveal whether the email is registered. Log server-side only.
  if (error) {
    console.error("password-reset request failed:", error.message);
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm run test:run -- password-reset/__tests__/route`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/rate-limit.ts src/app/api/members/password-reset/route.ts src/app/api/members/password-reset/__tests__/route.test.ts
git commit -m "feat: add rate-limited password-reset request API route"
```

---

## Task 2: Forgot-password request page

**Files:**
- Create: `src/app/members/forgot-password/ForgotPasswordPage.tsx`
- Create: `src/app/members/forgot-password/page.tsx`
- Test: `src/app/members/forgot-password/__tests__/ForgotPasswordPage.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/app/members/forgot-password/__tests__/ForgotPasswordPage.test.tsx`:

```tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@/test/test-utils";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { toast } from "sonner";
import { ForgotPasswordPage } from "../ForgotPasswordPage";

describe("ForgotPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("submits the email and navigates to the check-email page", async () => {
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ ok: true }) }) as Response);
    render(<ForgotPasswordPage />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "jane@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));
    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith(
        "/members/forgot-password/check-email?email=jane%40example.com",
      ),
    );
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/members/password-reset",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("shows a validation message and does not call fetch for an invalid email", async () => {
    global.fetch = vi.fn();
    render(<ForgotPasswordPage />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "not-an-email" } });
    fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));
    expect(await screen.findByText(/please enter a valid email/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("shows a rate-limit toast on a 429 response", async () => {
    global.fetch = vi.fn(async () => ({ ok: false, status: 429, json: async () => ({}) }) as Response);
    render(<ForgotPasswordPage />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "jane@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Too many requests. Please try again later."),
    );
    expect(mockPush).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run -- forgot-password/__tests__/ForgotPasswordPage`
Expected: FAIL — `../ForgotPasswordPage` cannot be resolved.

- [ ] **Step 3: Write the client component**

Create `src/app/members/forgot-password/ForgotPasswordPage.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const forgotSchema = z.object({
  email: z.string().email("Please enter a valid email"),
});

type ForgotForm = z.infer<typeof forgotSchema>;

export function ForgotPasswordPage() {
  const router = useRouter();

  const form = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: ForgotForm) => {
    const response = await fetch("/api/members/password-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: data.email }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        toast.error("Too many requests. Please try again later.");
      } else {
        toast.error("Couldn't send the reset email. Please try again.");
      }
      return;
    }

    router.push(
      `/members/forgot-password/check-email?email=${encodeURIComponent(data.email)}`,
    );
  };

  return (
    <div className="min-h-screen bg-charcoal flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif font-bold text-optical-white tracking-tight">
            Reset your password
          </h1>
          <p className="text-warm-gray mt-2">
            Enter your email and we&rsquo;ll send you a reset link.
          </p>
        </div>

        <div className="bg-primary-foreground/5 border border-primary-foreground/10 backdrop-blur-sm rounded-sm p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-optical-white">Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        className="bg-charcoal/50 border-primary-foreground/20 text-optical-white placeholder:text-warm-gray"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full bg-brass text-charcoal hover:bg-brass-muted"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? "Sending..." : "Send reset link"}
              </Button>
            </form>
          </Form>

          <p className="text-center text-warm-gray text-sm mt-6">
            Remembered it?{" "}
            <Link
              href="/members/login"
              className="text-brass-text hover:text-brass-muted transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>

        <div className="text-center mt-6">
          <Link
            href="/"
            className="text-warm-gray text-sm hover:text-optical-white transition-colors"
          >
            &larr; Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Write the server wrapper**

Create `src/app/members/forgot-password/page.tsx`:

```tsx
import type { Metadata } from "next";
import { ForgotPasswordPage } from "./ForgotPasswordPage";

export const metadata: Metadata = {
  title: "Reset your password",
};

export default function Page() {
  return <ForgotPasswordPage />;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm run test:run -- forgot-password/__tests__/ForgotPasswordPage`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/app/members/forgot-password/ForgotPasswordPage.tsx src/app/members/forgot-password/page.tsx src/app/members/forgot-password/__tests__/ForgotPasswordPage.test.tsx
git commit -m "feat: add forgot-password request page"
```

---

## Task 3: Resend reset button

**Files:**
- Create: `src/components/auth/ResendResetButton.tsx`
- Test: `src/components/auth/__tests__/ResendResetButton.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/auth/__tests__/ResendResetButton.test.tsx`:

```tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@/test/test-utils";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { ResendResetButton } from "../ResendResetButton";

describe("ResendResetButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when email is null", () => {
    const { container } = render(<ResendResetButton email={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("POSTs to the reset API and enters cooldown after a successful click", async () => {
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ ok: true }) }) as Response);
    render(<ResendResetButton email="jane@example.com" />);
    fireEvent.click(screen.getByRole("button", { name: /resend reset email/i }));
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/members/password-reset",
      expect.objectContaining({ method: "POST" }),
    );
    await waitFor(() =>
      expect(screen.getByRole("button")).toBeDisabled(),
    );
    expect(screen.getByRole("button").textContent).toMatch(/resend in \d+s/i);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run -- ResendResetButton`
Expected: FAIL — `../ResendResetButton` cannot be resolved.

- [ ] **Step 3: Write the component**

Create `src/components/auth/ResendResetButton.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const COOLDOWN_SECONDS = 30;

interface Props {
  email: string | null;
}

export function ResendResetButton({ email }: Props) {
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);

  useEffect(() => {
    if (remainingSeconds <= 0) return;
    const id = setInterval(() => {
      setRemainingSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [remainingSeconds]);

  if (!email) return null;

  const onCooldown = remainingSeconds > 0;

  async function handleClick() {
    try {
      const response = await fetch("/api/members/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        toast.error("Couldn't resend right now. Please try again.");
        return;
      }
      toast.success("Reset email sent");
      setRemainingSeconds(COOLDOWN_SECONDS);
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
      {onCooldown ? `Resend in ${remainingSeconds}s` : "Resend reset email"}
    </Button>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:run -- ResendResetButton`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/auth/ResendResetButton.tsx src/components/auth/__tests__/ResendResetButton.test.tsx
git commit -m "feat: add resend reset-email button with cooldown"
```

---

## Task 4: Check-email confirmation page

**Files:**
- Create: `src/app/members/forgot-password/check-email/page.tsx`
- Test: `src/app/members/forgot-password/check-email/__tests__/page.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/app/members/forgot-password/check-email/__tests__/page.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@/test/test-utils";
import Page from "../page";

describe("forgot-password check-email page", () => {
  it("renders the email and the resend control", async () => {
    const ui = await Page({ searchParams: Promise.resolve({ email: "jane@example.com" }) });
    render(ui);
    expect(screen.getByText("jane@example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /resend reset email/i })).toBeInTheDocument();
  });

  it("renders a generic message when no email is provided", async () => {
    const ui = await Page({ searchParams: Promise.resolve({}) });
    render(ui);
    expect(screen.getByRole("heading", { name: /check your email/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run -- forgot-password/check-email/__tests__/page`
Expected: FAIL — `../page` cannot be resolved.

- [ ] **Step 3: Write the page**

Create `src/app/members/forgot-password/check-email/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { ResendResetButton } from "@/components/auth/ResendResetButton";

export const metadata: Metadata = {
  title: "Check your email",
};

function firstString(v: string | string[] | undefined): string | null {
  if (Array.isArray(v)) return v[0]?.trim() || null;
  if (typeof v === "string") return v.trim() || null;
  return null;
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ email?: string | string[] }>;
}) {
  const sp = await searchParams;
  const email = firstString(sp.email);

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
                We sent a password reset link to{" "}
                <span className="text-optical-white font-medium">{email}</span>.
                Click the link to choose a new password.
              </>
            ) : (
              <>
                We sent a password reset link to your email. Click the link to
                choose a new password.
              </>
            )}
          </p>

          <div className="bg-charcoal/40 border border-primary-foreground/10 rounded-sm p-4">
            <p className="text-warm-gray text-sm">
              Can&rsquo;t find it? Check your junk or spam folder.
            </p>
          </div>

          <ol className="text-warm-gray text-sm space-y-2 list-decimal list-inside marker:text-brass-text marker:font-medium">
            <li>Click the link in the email</li>
            <li>Choose a new password</li>
            <li>You&rsquo;ll land on your dashboard</li>
          </ol>

          <ResendResetButton email={email} />

          <div className="flex flex-col sm:flex-row sm:justify-between gap-3 pt-2 text-sm text-center">
            <Link
              href="/members/forgot-password"
              className="text-warm-gray hover:text-optical-white transition-colors"
            >
              Wrong email? Start over
            </Link>
            <Link
              href="/members/login"
              className="text-brass-text hover:text-brass-muted transition-colors"
            >
              Remembered it? Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:run -- forgot-password/check-email/__tests__/page`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/members/forgot-password/check-email/page.tsx src/app/members/forgot-password/check-email/__tests__/page.test.tsx
git commit -m "feat: add password-reset check-email confirmation page"
```

---

## Task 5: Reset (new password) page

**Files:**
- Create: `src/app/members/reset-password/ResetPasswordPage.tsx`
- Create: `src/app/members/reset-password/page.tsx`
- Test: `src/app/members/reset-password/__tests__/ResetPasswordPage.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/app/members/reset-password/__tests__/ResetPasswordPage.test.tsx`:

```tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@/test/test-utils";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const mockUpdateUser = vi.fn();
let mockAuth: {
  user: unknown;
  loading: boolean;
  supabase: { auth: { updateUser: typeof mockUpdateUser } };
};
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => mockAuth,
}));

import { toast } from "sonner";
import { ResetPasswordPage } from "../ResetPasswordPage";

const supabase = { auth: { updateUser: mockUpdateUser } };

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateUser.mockResolvedValue({ error: null });
    mockAuth = { user: { id: "u1" }, loading: false, supabase };
  });

  it("shows a loading state while auth resolves", () => {
    mockAuth = { user: null, loading: true, supabase };
    render(<ResetPasswordPage />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /update password/i })).toBeNull();
  });

  it("shows the invalid-link state when there is no session", () => {
    mockAuth = { user: null, loading: false, supabase };
    render(<ResetPasswordPage />);
    expect(screen.getByText(/invalid or has expired/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /request a new link/i })).toHaveAttribute(
      "href",
      "/members/forgot-password",
    );
  });

  it("updates the password and redirects to the dashboard on success", async () => {
    render(<ResetPasswordPage />);
    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: "secret123" } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "secret123" } });
    fireEvent.click(screen.getByRole("button", { name: /update password/i }));
    await waitFor(() => expect(mockUpdateUser).toHaveBeenCalledWith({ password: "secret123" }));
    expect(mockPush).toHaveBeenCalledWith("/members/dashboard");
    expect(toast.success).toHaveBeenCalledWith("Password updated");
  });

  it("blocks submission when passwords do not match", async () => {
    render(<ResetPasswordPage />);
    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: "secret123" } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "different1" } });
    fireEvent.click(screen.getByRole("button", { name: /update password/i }));
    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it("blocks submission when the password is too short", async () => {
    render(<ResetPasswordPage />);
    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: "123" } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "123" } });
    fireEvent.click(screen.getByRole("button", { name: /update password/i }));
    expect(await screen.findByText(/at least 6 characters/i)).toBeInTheDocument();
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run -- reset-password/__tests__/ResetPasswordPage`
Expected: FAIL — `../ResetPasswordPage` cannot be resolved.

- [ ] **Step 3: Write the client component**

Create `src/app/members/reset-password/ResetPasswordPage.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const resetSchema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetForm = z.infer<typeof resetSchema>;

export function ResetPasswordPage() {
  const router = useRouter();
  const { user, loading, supabase } = useAuth();

  const form = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = async (data: ResetForm) => {
    const { error } = await supabase.auth.updateUser({ password: data.password });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated");
    router.push("/members/dashboard");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center px-4">
        <p className="text-warm-gray">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center space-y-4">
          <h1 className="text-3xl font-serif font-bold text-optical-white tracking-tight">
            This reset link is invalid or has expired
          </h1>
          <p className="text-warm-gray">
            Request a new password reset link to continue.
          </p>
          <Link
            href="/members/forgot-password"
            className="inline-block text-brass-text hover:text-brass-muted transition-colors"
          >
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-charcoal flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif font-bold text-optical-white tracking-tight">
            Set a new password
          </h1>
          <p className="text-warm-gray mt-2">
            Choose a new password for your account.
          </p>
        </div>

        <div className="bg-primary-foreground/5 border border-primary-foreground/10 backdrop-blur-sm rounded-sm p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-optical-white">
                      New password
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        className="bg-charcoal/50 border-primary-foreground/20 text-optical-white placeholder:text-warm-gray"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-optical-white">
                      Confirm password
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        className="bg-charcoal/50 border-primary-foreground/20 text-optical-white placeholder:text-warm-gray"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full bg-brass text-charcoal hover:bg-brass-muted"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? "Updating..." : "Update password"}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Write the server wrapper**

Create `src/app/members/reset-password/page.tsx`:

```tsx
import type { Metadata } from "next";
import { ResetPasswordPage } from "./ResetPasswordPage";

export const metadata: Metadata = {
  title: "Set a new password",
};

export default function Page() {
  return <ResetPasswordPage />;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm run test:run -- reset-password/__tests__/ResetPasswordPage`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add src/app/members/reset-password/ResetPasswordPage.tsx src/app/members/reset-password/page.tsx src/app/members/reset-password/__tests__/ResetPasswordPage.test.tsx
git commit -m "feat: add reset-password page with auth guard"
```

---

## Task 6: "Forgot password?" link on the login page

**Files:**
- Modify: `src/app/members/login/LoginPage.tsx`
- Test: `src/app/members/login/__tests__/LoginPage.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/app/members/login/__tests__/LoginPage.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@/test/test-utils";

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ signIn: vi.fn() }),
}));

import { LoginPage } from "../LoginPage";

describe("LoginPage", () => {
  it("shows a Forgot password link pointing to /members/forgot-password", () => {
    render(<LoginPage />);
    const link = screen.getByRole("link", { name: /forgot password/i });
    expect(link).toHaveAttribute("href", "/members/forgot-password");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run -- login/__tests__/LoginPage`
Expected: FAIL — no link with name "Forgot password".

- [ ] **Step 3: Add the link**

In `src/app/members/login/LoginPage.tsx`, insert the following block between the password `FormField` (the one whose `name="password"`, which ends with `/>`) and the submit `Button`:

```tsx
              <div className="text-right -mt-2">
                <Link
                  href="/members/forgot-password"
                  className="text-sm text-brass-text hover:text-brass-muted transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
```

For reference, the result reads:

```tsx
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-optical-white">
                      Password
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        className="bg-charcoal/50 border-primary-foreground/20 text-optical-white placeholder:text-warm-gray"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="text-right -mt-2">
                <Link
                  href="/members/forgot-password"
                  className="text-sm text-brass-text hover:text-brass-muted transition-colors"
                >
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full bg-brass text-charcoal hover:bg-brass-muted"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? "Signing in..." : "Sign In"}
              </Button>
```

(`Link` is already imported at the top of `LoginPage.tsx` — no new import needed.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:run -- login/__tests__/LoginPage`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add src/app/members/login/LoginPage.tsx src/app/members/login/__tests__/LoginPage.test.tsx
git commit -m "feat: add Forgot password link to the login page"
```

---

## Task 7: Suppress header auth CTAs on the new routes

**Files:**
- Modify: `src/components/landing/Header.tsx`
- Test: `src/components/landing/__tests__/Header.test.tsx`

- [ ] **Step 1: Write the failing test**

Append to `src/components/landing/__tests__/Header.test.tsx`, inside the existing top-level `describe("Header", ...)` block (after the last existing `it(...)`, before the closing `});` of the describe):

```tsx
  it.each([
    "/members/forgot-password",
    "/members/forgot-password/check-email",
    "/members/reset-password",
  ])("logged-out user on %s does NOT see Sign In or Create Account", (path) => {
    pathnameRef.current = path;
    useAuthMock.mockReturnValue(loggedOut);
    render(<Header />);
    expect(screen.queryByRole("link", { name: /sign in/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /create account/i })).toBeNull();
  });
```

(`pathnameRef`, `useAuthMock`, and `loggedOut` are already defined at the top of this test file.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run -- Header.test`
Expected: FAIL — the new routes are not in `AUTH_PAGE_PATHS`, so Sign In / Create Account still render.

- [ ] **Step 3: Add the routes to AUTH_PAGE_PATHS**

In `src/components/landing/Header.tsx`, replace the existing set:

```tsx
const AUTH_PAGE_PATHS: ReadonlySet<string> = new Set([
  "/members/login",
  "/members/signup",
  "/members/signup/check-email",
]);
```

with:

```tsx
const AUTH_PAGE_PATHS: ReadonlySet<string> = new Set([
  "/members/login",
  "/members/signup",
  "/members/signup/check-email",
  "/members/forgot-password",
  "/members/forgot-password/check-email",
  "/members/reset-password",
]);
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:run -- Header.test`
Expected: PASS (existing tests plus the 3 new cases).

- [ ] **Step 5: Commit**

```bash
git add src/components/landing/Header.tsx src/components/landing/__tests__/Header.test.tsx
git commit -m "feat: suppress header auth CTAs on password-reset routes"
```

---

## Task 8: Full verification

- [ ] **Step 1: Run the whole test suite**

Run: `npm run test:run`
Expected: all suites pass (existing + the new password-reset suites).

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no new issues in any created/modified file (pre-existing warnings in untouched files are acceptable).

- [ ] **Step 3: Manual smoke test (dev)**

Run: `npm run dev`, then walk the flow:
1. `/members/login` shows "Forgot password?" → click → `/members/forgot-password`.
2. Submit a registered email → lands on `/members/forgot-password/check-email?email=...` showing the address and a "Resend reset email" button (button disables for 30s after a click).
3. Submit an **unregistered** email → same confirmation screen (enumeration protection).
4. Open the Supabase recovery link (local inbox / Supabase logs) → it routes through `/auth/callback` → `/members/reset-password`.
5. On `/members/reset-password`: mismatched passwords and a <6-char password both block submission; a valid matching password updates and redirects to `/members/dashboard` with a "Password updated" toast.
6. Visit `/members/reset-password` directly while signed out → "This reset link is invalid or has expired" with a link back to `/members/forgot-password`.
7. Header shows no Sign In / Create Account CTAs on the three new routes.

- [ ] **Step 4: Confirm copy + ops**

- Grep the new/edited files for em dashes in customer-facing strings — there should be none.
- Ops (outside code, no commit): in the Supabase dashboard, confirm the "Reset Password" email template is enabled and `…/auth/callback` is in the Redirect URL allowlist for each origin (`https://butlersinc.com`, `https://staging.butlersinc.com`, `http://localhost:3000`). Already documented in `CLAUDE.md`.

---

## Self-Review Notes

- **Spec coverage:** request page (Task 2), API route + rate limit + enumeration protection (Task 1), check-email + resend (Tasks 3-4), reset page with auth guard + validation (Task 5), login link (Task 6), header suppression (Task 7), verification incl. ops note (Task 8). All spec sections map to a task.
- **No callback/AuthContext changes:** confirmed `/auth/callback` already exchanges the recovery `code` and validates `next` (`startsWith("/")`), and `useAuth()` already exposes `user`, `loading`, and `supabase`.
- **Type/name consistency:** API path `/api/members/password-reset`, redirect `?next=/members/reset-password`, and route strings are identical across the route, both pages, the resend button, and all tests.
- **Resend component decision:** a focused sibling (`ResendResetButton`) rather than generalizing `ResendVerificationButton`, because the send path differs (API route POST for rate-limiting + enumeration protection vs `supabase.auth.resend`). The ~8-line cooldown is the only duplication.
