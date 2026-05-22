# Audience CTA Section Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an auth-aware dual-audience CTA section to the homepage that routes new visitors to browse butlers and returning members to their dashboard.

**Architecture:** A new `AudienceCTA` client component reads `useAuth()` (already used by the Header — no new infrastructure). When loading it renders nothing. When unauthenticated it shows two side-by-side cards. When authenticated it shows a single personalised welcome card. The component is inserted in `src/app/page.tsx` between `<Hero />` and `<HowItWorks />`.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS v4, Framer Motion (`motion/react`), Vitest + Testing Library

---

## Key Codebase Facts

- **Auth hook:** `useAuth()` from `@/context/AuthContext` — returns `{ user, loading }`. `user` is a Supabase `User` object. User's display name is at `user.user_metadata?.name` (string or undefined).
- **Test utilities:** Always import `render` and `screen` from `@/test/test-utils` (not `@testing-library/react` directly). It wraps `QueryClientProvider` and mocks `next/link`, `next/image`, `next/navigation`.
- **Mock auth in tests:** `vi.mock("@/context/AuthContext", () => ({ useAuth: () => ({ ... }) }))` — mock the whole module, return the shape directly from `useAuth`.
- **Design conventions:** `rounded-sm` (1–2px), `bg-charcoal`, brass = `bg-brass text-charcoal`, ghost = `border border-optical-white/40 text-optical-white`. Framer Motion for entrance animation via `motion/react`. All sections need explicit `bg-charcoal` since the body default is a cream/ivory colour.
- **Run tests:** `npm run test:run` — Vitest, jsdom. Watch mode: `npm test`.

---

## Task 1: Build and test the AudienceCTA component

**Files:**
- Create: `src/components/landing/AudienceCTA.tsx`
- Create: `src/components/landing/__tests__/AudienceCTA.test.tsx`

---

**Step 1: Write the failing tests**

Create `src/components/landing/__tests__/AudienceCTA.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@/test/test-utils";
import { AudienceCTA } from "../AudienceCTA";

describe("AudienceCTA", () => {
  it("renders nothing while auth is loading", () => {
    vi.mock("@/context/AuthContext", () => ({
      useAuth: () => ({ user: null, loading: true }),
    }));
    const { container } = render(<AudienceCTA />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders two cards when unauthenticated", () => {
    vi.mock("@/context/AuthContext", () => ({
      useAuth: () => ({ user: null, loading: false }),
    }));
    render(<AudienceCTA />);
    expect(screen.getByText("New to Butlers Inc.?")).toBeInTheDocument();
    expect(screen.getByText("Already a member?")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Browse Our Butlers/i })).toHaveAttribute("href", "/butlers");
    expect(screen.getByRole("link", { name: /Sign In/i })).toHaveAttribute("href", "/members/login");
  });

  it("renders personalised welcome card when authenticated", () => {
    vi.mock("@/context/AuthContext", () => ({
      useAuth: () => ({
        user: {
          id: "user-1",
          email: "jane@example.com",
          user_metadata: { name: "Jane Smith" },
        },
        loading: false,
      }),
    }));
    render(<AudienceCTA />);
    expect(screen.getByText(/Welcome back, Jane/i)).toBeInTheDocument();
    expect(screen.queryByText("New to Butlers Inc.?")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Go to Dashboard/i })).toHaveAttribute("href", "/members/dashboard");
  });

  it("falls back to email prefix when user has no name", () => {
    vi.mock("@/context/AuthContext", () => ({
      useAuth: () => ({
        user: {
          id: "user-2",
          email: "hello@example.com",
          user_metadata: {},
        },
        loading: false,
      }),
    }));
    render(<AudienceCTA />);
    expect(screen.getByText(/Welcome back, hello/i)).toBeInTheDocument();
  });
});
```

**Step 2: Run tests to confirm they fail**

```bash
npm run test:run -- src/components/landing/__tests__/AudienceCTA.test.tsx
```

Expected: FAIL — "Cannot find module '../AudienceCTA'"

---

**Step 3: Create the component**

Create `src/components/landing/AudienceCTA.tsx`:

```tsx
"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { useAuth } from "@/context/AuthContext";

function getFirstName(user: { email?: string | null; user_metadata?: { name?: string } }): string {
  const fullName = user.user_metadata?.name;
  if (fullName) return fullName.split(" ")[0];
  return user.email?.split("@")[0] ?? "there";
}

export function AudienceCTA() {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (user) {
    return (
      <section className="bg-charcoal py-12 px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-4xl mx-auto border border-primary-foreground/10 rounded-sm p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-l-2 border-l-brass"
        >
          <div>
            <p className="text-2xl font-serif font-bold text-optical-white">
              Welcome back, {getFirstName(user)}.
            </p>
            <p className="mt-1 text-warm-gray text-sm">
              Your butler is ready when you are.
            </p>
          </div>
          <Link
            href="/members/dashboard"
            className="shrink-0 px-6 py-3 rounded-sm bg-brass text-charcoal font-medium hover:bg-brass-muted transition-colors text-sm tracking-wide"
          >
            Go to Dashboard
          </Link>
        </motion.div>
      </section>
    );
  }

  return (
    <section className="bg-charcoal py-12 px-6">
      <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* New visitor card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="border border-primary-foreground/10 rounded-sm p-8 flex flex-col gap-4"
        >
          <h2 className="text-xl font-serif font-bold text-optical-white">
            New to Butlers Inc.?
          </h2>
          <p className="text-warm-gray text-sm leading-relaxed">
            Premium concierge across England from £35/hr. No contract.
          </p>
          <Link
            href="/butlers"
            className="self-start px-6 py-3 rounded-sm bg-brass text-charcoal font-medium hover:bg-brass-muted transition-colors text-sm tracking-wide"
          >
            Browse Our Butlers
          </Link>
        </motion.div>

        {/* Returning member card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.45, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="border border-primary-foreground/10 rounded-sm p-8 flex flex-col gap-4"
        >
          <h2 className="text-xl font-serif font-bold text-optical-white">
            Already a member?
          </h2>
          <p className="text-warm-gray text-sm leading-relaxed">
            Pick up where you left off.
          </p>
          <Link
            href="/members/login"
            className="self-start px-6 py-3 rounded-sm border border-optical-white/40 text-optical-white font-medium hover:border-optical-white hover:bg-optical-white/10 transition-colors text-sm tracking-wide"
          >
            Sign In
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
```

**Step 4: Run tests to confirm they pass**

```bash
npm run test:run -- src/components/landing/__tests__/AudienceCTA.test.tsx
```

Expected: 4/4 PASS

**Step 5: Commit**

```bash
git add src/components/landing/AudienceCTA.tsx src/components/landing/__tests__/AudienceCTA.test.tsx
git commit -m "feat: add auth-aware AudienceCTA component"
```

---

## Task 2: Wire AudienceCTA into the homepage

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/__tests__/HomePage.test.tsx`

---

**Step 1: Update the HomePage test to assert the new section renders**

Open `src/app/__tests__/HomePage.test.tsx`. Add a mock for `AudienceCTA` alongside the existing mocks, and add an assertion that it renders.

Add to the existing `vi.mock` block at the top of the file:

```tsx
vi.mock("@/components/landing/AudienceCTA", () => ({
  AudienceCTA: () => <div data-testid="audience-cta">AudienceCTA</div>,
}));
```

Add a new `it` assertion inside the existing `describe` block:

```tsx
it("renders the AudienceCTA section", () => {
  render(<Home />);
  expect(screen.getByTestId("audience-cta")).toBeInTheDocument();
});
```

**Step 2: Run the test to confirm it fails**

```bash
npm run test:run -- src/app/__tests__/HomePage.test.tsx
```

Expected: FAIL — "audience-cta" not found

**Step 3: Update `src/app/page.tsx`**

```tsx
import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { AudienceCTA } from "@/components/landing/AudienceCTA";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { ButlerCategoryGrid } from "@/components/landing/ButlerCategoryGrid";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <main id="main-content">
        <Hero />
        <AudienceCTA />
        <HowItWorks />
        <ButlerCategoryGrid />
      </main>
      <Footer />
    </>
  );
}
```

**Step 4: Run all tests**

```bash
npm run test:run
```

Expected: all pass except the 4 pre-existing `ServiceOptionSelector` failures.

**Step 5: Commit**

```bash
git add src/app/page.tsx src/app/__tests__/HomePage.test.tsx
git commit -m "feat: wire AudienceCTA into homepage between hero and how-it-works"
```
