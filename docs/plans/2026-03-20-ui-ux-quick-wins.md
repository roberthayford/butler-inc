# UI/UX Quick Wins Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the 10 highest-impact, lowest-effort issues identified in `docs/ui-ux-audit-2026-03-20.md`

**Architecture:** All changes are isolated to existing files — no new routes, no schema changes, no new dependencies. Tasks 1–2 are composition/copy changes. Task 3 updates the booking form (has existing tests that must be updated). Task 4 fixes dashboard data display. Tasks 5–10 are small targeted fixes.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS v4, Vitest + Testing Library, Lucide React

**Run tests with:** `npm run test:run`
**Dev server:** `npm run dev` (http://localhost:3000)

---

## Task 1: Homepage — Add missing content sections

**Why:** The homepage only shows a hero + footer. `HowItWorks` and `ButlerCategoryGrid` exist but are never rendered on `/`. First-time visitors have no information to act on.

**Files:**
- Modify: `src/app/page.tsx`

---

**Step 1: Write a failing test**

Create `src/app/__tests__/HomePage.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@/test/test-utils";
import Home from "../page";

// Mock heavy sub-components to keep unit test focused
vi.mock("@/components/landing/Hero", () => ({
  Hero: () => <div data-testid="hero">Hero</div>,
}));
vi.mock("@/components/landing/HowItWorks", () => ({
  HowItWorks: () => <div data-testid="how-it-works">HowItWorks</div>,
}));
vi.mock("@/components/landing/ButlerCategoryGrid", () => ({
  ButlerCategoryGrid: () => <div data-testid="butler-grid">ButlerCategoryGrid</div>,
}));
vi.mock("@/components/landing/Header", () => ({
  Header: () => <div data-testid="header">Header</div>,
}));
vi.mock("@/components/landing/Footer", () => ({
  Footer: () => <div data-testid="footer">Footer</div>,
}));

describe("Home page", () => {
  it("renders HowItWorks section", () => {
    render(<Home />);
    expect(screen.getByTestId("how-it-works")).toBeInTheDocument();
  });

  it("renders ButlerCategoryGrid section", () => {
    render(<Home />);
    expect(screen.getByTestId("butler-grid")).toBeInTheDocument();
  });
});
```

**Step 2: Run test — expect FAIL**

```bash
npm run test:run -- src/app/__tests__/HomePage.test.tsx
```

Expected: `Cannot find module` or `how-it-works not found`

**Step 3: Implement — update `src/app/page.tsx`**

```tsx
import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { ButlerCategoryGrid } from "@/components/landing/ButlerCategoryGrid";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <main id="main-content">
        <Hero />
        <HowItWorks />
        <ButlerCategoryGrid />
      </main>
      <Footer />
    </>
  );
}
```

**Step 4: Run test — expect PASS**

```bash
npm run test:run -- src/app/__tests__/HomePage.test.tsx
```

**Step 5: Verify visually**

Navigate to http://localhost:3000 — you should see the hero, then "How Butlers Inc. Works" (4 steps), then the 6 butler cards, then the footer.

**Step 6: Commit**

```bash
git add src/app/page.tsx src/app/__tests__/HomePage.test.tsx
git commit -m "feat: add HowItWorks and ButlerCategoryGrid to homepage"
```

---

## Task 2: Hero — Replace confusing tabs with clear CTAs + subtitle

**Why:** The "Members / Non-Members" segmented control looks like tabs but immediately redirects — a navigation anti-pattern. New visitors also have no pricing context.

**Files:**
- Modify: `src/components/landing/Hero.tsx`

---

**Step 1: Write a failing test**

Create `src/components/landing/__tests__/Hero.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@/test/test-utils";
import { Hero } from "../Hero";

vi.mock("motion/react", () => ({
  motion: {
    h1: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
      <h1 {...props}>{children}</h1>
    ),
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
    p: ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
      <p {...props}>{children}</p>
    ),
  },
}));

vi.mock("@/components/ui/hero-background", () => ({
  LandingHeroBackground: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

describe("Hero", () => {
  it("renders the headline", () => {
    render(<Hero />);
    expect(
      screen.getByText("Your personal butler, on demand.")
    ).toBeInTheDocument();
  });

  it("renders a pricing subtitle", () => {
    render(<Hero />);
    expect(screen.getByText(/From £35\/hr/)).toBeInTheDocument();
  });

  it("renders a 'Browse Our Butlers' CTA link", () => {
    render(<Hero />);
    const link = screen.getByRole("link", { name: /Browse Our Butlers/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/butlers");
  });

  it("renders a 'Sign In' CTA link", () => {
    render(<Hero />);
    const link = screen.getByRole("link", { name: /Sign In/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/members/login");
  });

  it("does NOT render the old Members/Non-Members tab buttons", () => {
    render(<Hero />);
    expect(screen.queryByRole("button", { name: "Members" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Non-Members" })).not.toBeInTheDocument();
  });
});
```

**Step 2: Run test — expect FAIL**

```bash
npm run test:run -- src/components/landing/__tests__/Hero.test.tsx
```

Expected: failures on "pricing subtitle", "Browse Our Butlers", "Sign In" tests.

**Step 3: Implement — update `src/components/landing/Hero.tsx`**

```tsx
"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { LandingHeroBackground } from "@/components/ui/hero-background";

export function Hero() {
  return (
    <LandingHeroBackground className="min-h-screen flex items-center justify-center">
      <div className="text-center px-6 max-w-4xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-serif font-bold text-optical-white tracking-tight leading-tight"
        >
          Your personal butler, on demand.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="mt-4 text-warm-gray text-lg"
        >
          Premium concierge across England. From £35/hr.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            href="/butlers"
            className="px-8 py-3 rounded-sm bg-brass text-charcoal font-medium hover:bg-brass-muted transition-colors text-sm tracking-wide"
          >
            Browse Our Butlers
          </Link>
          <Link
            href="/members/login"
            className="px-8 py-3 rounded-sm border border-optical-white/40 text-optical-white font-medium hover:border-optical-white hover:bg-optical-white/10 transition-colors text-sm tracking-wide"
          >
            Sign In
          </Link>
        </motion.div>
      </div>
    </LandingHeroBackground>
  );
}
```

**Step 4: Run test — expect PASS**

```bash
npm run test:run -- src/components/landing/__tests__/Hero.test.tsx
```

**Step 5: Verify visually**

Navigate to http://localhost:3000 — the hero should show headline, subtitle "From £35/hr", and two side-by-side buttons: "Browse Our Butlers" (brass/gold) and "Sign In" (ghost/outlined).

**Step 6: Commit**

```bash
git add src/components/landing/Hero.tsx src/components/landing/__tests__/Hero.test.tsx
git commit -m "feat: replace hero tabs with clear CTAs and pricing subtitle"
```

---

## Task 3: Booking form — Add visible labels (WCAG fix)

**Why:** All contact fields use `sr-only` labels with placeholder-only visible text. Placeholders disappear on input — WCAG 2.1 AA failure.

**Important:** Existing tests in `src/components/booking/__tests__/BookingForm.test.tsx` check the submit button text `"Submit Booking Request"` — these will be updated in this task too.

**Files:**
- Modify: `src/components/booking/BookingForm.tsx`
- Modify: `src/components/booking/__tests__/BookingForm.test.tsx`

---

**Step 1: Update the test first — change button text expectations and add label tests**

In `src/components/booking/__tests__/BookingForm.test.tsx`, update the following:

Change line 63–67 (submit button renders test):
```tsx
it("renders submit button", () => {
  render(<BookingForm {...defaultProps} />);
  expect(screen.getByRole("button", { name: /Request Your Butler/i })).toBeInTheDocument();
});
```

Change line 70–74 (submitting state test):
```tsx
it("shows loading text when isSubmitting is true", () => {
  render(<BookingForm {...defaultProps} isSubmitting={true} />);
  expect(screen.getByText("Sending your request...")).toBeInTheDocument();
});
```

Change line 75–79 (disabled when submitting test):
```tsx
it("disables submit button when isSubmitting", () => {
  render(<BookingForm {...defaultProps} isSubmitting={true} />);
  expect(screen.getByText("Sending your request...")).toBeDisabled();
});
```

Change line 82–90 (validation errors test — update the click target):
```tsx
it("shows validation errors when submitting empty form", async () => {
  render(<BookingForm {...defaultProps} />);
  fireEvent.click(screen.getByRole("button", { name: /Request Your Butler/i }));
  await waitFor(() => {
    expect(screen.getByText("Name is required")).toBeInTheDocument();
  });
});
```

Add these new tests at the bottom of the `describe` block:
```tsx
it("renders visible label for Full name field", () => {
  render(<BookingForm {...defaultProps} />);
  expect(screen.getByText("Full name")).toBeVisible();
});

it("renders visible label for Email address field", () => {
  render(<BookingForm {...defaultProps} />);
  expect(screen.getByText("Email address")).toBeVisible();
});

it("renders visible label for Phone number field", () => {
  render(<BookingForm {...defaultProps} />);
  expect(screen.getByText("Phone number")).toBeVisible();
});
```

**Step 2: Run tests — expect FAIL**

```bash
npm run test:run -- src/components/booking/__tests__/BookingForm.test.tsx
```

Expected: button text tests fail ("Submit Booking Request" no longer matches), label visibility tests fail.

**Step 3: Implement — update `src/components/booking/BookingForm.tsx`**

Replace the Contact Details fieldset (lines ~179–257) with visible labels:

```tsx
{/* Contact Details */}
<fieldset className="space-y-4">
  <Label asChild>
    <legend className="text-optical-white text-base font-serif">
      Your details
    </legend>
  </Label>

  <div className="space-y-3">
    <div className="space-y-1.5">
      <label htmlFor="booking-name" className="text-sm text-optical-white/80">
        Full name
      </label>
      <Input
        id="booking-name"
        {...register("name")}
        placeholder="Jane Smith"
        autoComplete="name"
        className="bg-charcoal/50 border-primary-foreground/20 text-optical-white placeholder:text-warm-gray/50 focus-visible:ring-brass"
      />
      {errors.name && (
        <p className="text-destructive text-sm mt-1" role="alert">
          {errors.name.message}
        </p>
      )}
    </div>

    <div className="space-y-1.5">
      <label htmlFor="booking-email" className="text-sm text-optical-white/80">
        Email address
      </label>
      <Input
        id="booking-email"
        {...register("email")}
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
        className="bg-charcoal/50 border-primary-foreground/20 text-optical-white placeholder:text-warm-gray/50 focus-visible:ring-brass"
      />
      {errors.email && (
        <p className="text-destructive text-sm mt-1" role="alert">
          {errors.email.message}
        </p>
      )}
    </div>

    <div className="space-y-1.5">
      <label htmlFor="booking-phone" className="text-sm text-optical-white/80">
        Phone number
      </label>
      <Input
        id="booking-phone"
        {...register("phone")}
        type="tel"
        placeholder="07700 900000"
        autoComplete="tel"
        pattern="[0-9+\s\-()]*"
        className="bg-charcoal/50 border-primary-foreground/20 text-optical-white placeholder:text-warm-gray/50 focus-visible:ring-brass"
      />
      {errors.phone && (
        <p className="text-destructive text-sm mt-1" role="alert">
          {errors.phone.message}
        </p>
      )}
    </div>

    <div className="space-y-1.5">
      <label htmlFor="booking-notes" className="text-sm text-optical-white/80">
        Additional notes <span className="text-warm-gray/60">(optional)</span>
      </label>
      <Textarea
        id="booking-notes"
        {...register("notes")}
        placeholder="Any specific requirements or details..."
        className="bg-charcoal/50 border-primary-foreground/20 text-optical-white placeholder:text-warm-gray/50 resize-none focus-visible:ring-brass"
        rows={3}
      />
    </div>
  </div>
</fieldset>
```

Also update the submit button (lines ~259–265):
```tsx
<Button
  type="submit"
  disabled={isSubmitting}
  className="w-full py-6 text-lg bg-brass text-charcoal hover:bg-brass-muted font-medium"
>
  {isSubmitting ? "Sending your request..." : "Request Your Butler"}
</Button>
```

**Step 4: Run tests — expect PASS**

```bash
npm run test:run -- src/components/booking/__tests__/BookingForm.test.tsx
```

**Step 5: Verify visually**

Navigate to http://localhost:3000/butlers/busy and select a service option. In the booking form, the contact fields should each have a visible label above the input. The submit button should read "Request Your Butler".

**Step 6: Run all tests to check for regressions**

```bash
npm run test:run
```

Expected: all tests pass.

**Step 7: Commit**

```bash
git add src/components/booking/BookingForm.tsx src/components/booking/__tests__/BookingForm.test.tsx
git commit -m "fix: add visible labels to booking form fields (WCAG AA) and improve button copy"
```

---

## Task 4: Dashboard — Fix raw enum display values

**Why:** Dashboard booking rows show internal database values (`"busy"`, `"advance"`, `"morning"`) instead of human-readable display labels. No booking date is shown.

**Files:**
- Modify: `src/app/members/dashboard/page.tsx`

Note: `DAY_OPTIONS` and `TIME_SLOTS` in `src/data/booking-config.ts` and `services` in `src/data/services.ts` already have the display labels — derive from those rather than duplicating.

---

**Step 1: Write a failing test**

Create `src/app/members/__tests__/dashboard.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@/test/test-utils";
import MemberDashboard from "../dashboard/page";

// Mock auth — provide a logged-in user
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "test@example.com", user_metadata: { name: "Jane" } },
    loading: false,
    signOut: vi.fn(),
    supabase: {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () =>
              Promise.resolve({
                data: [
                  {
                    id: "booking-1",
                    butler_type: "busy",
                    service_option: "Courier and package services",
                    day_option: "advance",
                    time_slot: "morning",
                    reference: "REF001",
                    status: "confirmed",
                    created_at: "2026-03-15T10:00:00Z",
                  },
                ],
                error: null,
              }),
          }),
        }),
      }),
    },
  }),
}));

describe("MemberDashboard", () => {
  it("renders butler name as display label not raw key", async () => {
    render(<MemberDashboard />);
    expect(await screen.findByText(/Busy Butler/)).toBeInTheDocument();
    expect(screen.queryByText(/^busy Butler/)).not.toBeInTheDocument();
  });

  it("renders day option as display label not raw key", async () => {
    render(<MemberDashboard />);
    // "72+ Hours Notice" is the label for "advance"
    expect(await screen.findByText(/72\+ Hours Notice/)).toBeInTheDocument();
    expect(screen.queryByText(/\badvance\b/)).not.toBeInTheDocument();
  });

  it("renders time slot as display label not raw key", async () => {
    render(<MemberDashboard />);
    expect(await screen.findByText(/Morning/)).toBeInTheDocument();
  });

  it("renders a formatted booking date", async () => {
    render(<MemberDashboard />);
    // Booking created_at: 2026-03-15T10:00:00Z → "15 Mar 2026"
    expect(await screen.findByText(/15 Mar 2026/)).toBeInTheDocument();
  });
});
```

**Step 2: Run tests — expect FAIL**

```bash
npm run test:run -- src/app/members/__tests__/dashboard.test.tsx
```

Expected: label and date tests fail.

**Step 3: Implement — update `src/app/members/dashboard/page.tsx`**

Add imports and label maps at the top of the file (after the `"use client"` directive):

```tsx
import { services } from "@/data/services";
import { DAY_OPTIONS, TIME_SLOTS } from "@/data/booking-config";
import { format } from "date-fns";

// Display label lookups derived from existing data constants
const BUTLER_LABELS = Object.fromEntries(services.map((s) => [s.id, s.name]));
const DAY_LABELS = Object.fromEntries(DAY_OPTIONS.map((d) => [d.key, d.label]));
const TIME_LABELS = Object.fromEntries(TIME_SLOTS.map((t) => [t.key, t.label]));
```

Update the booking row JSX (replace the two `<p>` elements inside the row):

```tsx
<div>
  <p className="text-optical-white font-medium">
    {BUTLER_LABELS[booking.butler_type] ?? booking.butler_type} &mdash; {booking.reference}
  </p>
  <p className="text-warm-gray text-sm">
    {booking.service_option ?? "Custom request"} &bull;{" "}
    {DAY_LABELS[booking.day_option] ?? booking.day_option} &bull;{" "}
    {TIME_LABELS[booking.time_slot] ?? booking.time_slot}
  </p>
  <p className="text-warm-gray/60 text-xs mt-0.5">
    {format(new Date(booking.created_at), "d MMM yyyy")}
  </p>
</div>
```

**Step 4: Run tests — expect PASS**

```bash
npm run test:run -- src/app/members/__tests__/dashboard.test.tsx
```

**Step 5: Run all tests to check for regressions**

```bash
npm run test:run
```

**Step 6: Commit**

```bash
git add src/app/members/dashboard/page.tsx src/app/members/__tests__/dashboard.test.tsx
git commit -m "fix: display human-readable labels and booking date in dashboard"
```

---

## Task 5: Global CSS — Add `prefers-reduced-motion` for keyframes

**Why:** CSS keyframe animations (`fade-up`, `fade-in`) defined in `globals.css` do not respect the OS-level "Reduce Motion" accessibility preference. Framer Motion handles its own animations, but these CSS classes do not.

**Files:**
- Modify: `src/app/globals.css`

---

**Step 1: Add the reduced-motion block**

In `src/app/globals.css`, append this block to the `@layer utilities` section (after `.tabs-scroll` rules, before the closing brace):

```css
@media (prefers-reduced-motion: reduce) {
  .animate-fade-up,
  .animate-fade-up-slow,
  .animate-fade-in {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
}
```

No test needed — this is a pure CSS accessibility fix. Visual verification is sufficient.

**Step 2: Verify**

In Chrome DevTools → Rendering → "Emulate CSS media feature `prefers-reduced-motion`" → set to `reduce`. Navigate to the homepage and confirm no fade-up animations play.

**Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "fix: respect prefers-reduced-motion for CSS keyframe animations"
```

---

## Task 6: Add page titles to login and signup pages

**Why:** Both auth pages inherit the default layout title ("Butlers Inc. | Premium Concierge Service"), making browser tabs and screen readers confusing.

**Files:**
- Modify: `src/app/members/login/page.tsx`
- Modify: `src/app/members/signup/page.tsx`

---

**Step 1: Update login page**

Add at the top of `src/app/members/login/page.tsx` (after `"use client"` — note: because this is a client component, metadata export doesn't work directly; we need a server wrapper or use a different approach):

Actually, since `login/page.tsx` uses `"use client"`, we cannot export `metadata` directly from it. The correct approach is to use `<title>` via a server layout wrapper, or set the document title imperatively. The simplest solution for now is to add a server-side layout for the `members` route group.

Create `src/app/members/layout.tsx`:

```tsx
import type { Metadata } from "next";

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
  return <>{children}</>;
}
```

Then add per-page metadata by creating server wrapper files. Since the pages are `"use client"`, move the metadata to a separate server component wrapper:

For login, create `src/app/members/login/metadata.ts`:
```ts
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Sign In" };
```

Wait — this won't work with client components directly. The correct Next.js 16 pattern is: **the `page.tsx` must be a Server Component to export `metadata`**. If you need client interactivity, extract the client logic to a child component.

**Revised approach — split each auth page into server shell + client form:**

For login:
1. Rename the current `login/page.tsx` content to `login/LoginForm.tsx` (add `"use client"` at top)
2. Rewrite `login/page.tsx` as a Server Component that exports metadata and renders `<LoginForm />`

**Step 1a: Create `src/app/members/login/LoginForm.tsx`**

Move all the current content of `login/page.tsx` into this new file (keep `"use client"` at top, rename the export to `LoginForm`).

**Step 1b: Rewrite `src/app/members/login/page.tsx`**

```tsx
import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Sign In",
};

export default function LoginPage() {
  return <LoginForm />;
}
```

**Step 1c: Do the same for signup**

Create `src/app/members/signup/SignupForm.tsx` (move content from `signup/page.tsx`).

Rewrite `src/app/members/signup/page.tsx`:
```tsx
import type { Metadata } from "next";
import { SignupForm } from "./SignupForm";

export const metadata: Metadata = {
  title: "Join",
};

export default function SignUpPage() {
  return <SignupForm />;
}
```

**Step 2: Verify**

Navigate to http://localhost:3000/members/login — browser tab should read "Sign In | Butlers Inc."
Navigate to http://localhost:3000/members/signup — browser tab should read "Join | Butlers Inc."

**Step 3: Run all tests**

```bash
npm run test:run
```

**Step 4: Commit**

```bash
git add src/app/members/login/ src/app/members/signup/
git commit -m "fix: add descriptive page titles to login and signup pages"
```

---

## Task 7: Add `<Footer />` to butler detail pages

**Why:** Butler detail pages have no footer — no contact info, no legal links, no navigation below the booking form. The `src/app/butlers/layout.tsx` currently only adds `<Header />`.

**Files:**
- Modify: `src/app/butlers/layout.tsx`

---

**Step 1: Update the butlers layout**

```tsx
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";

export default function ButlersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  );
}
```

**Step 2: Verify visually**

Navigate to http://localhost:3000/butlers/busy and scroll to the bottom — you should now see the full footer with "Our Butlers" links, "Legal" links, contact email, and copyright.

Also check http://localhost:3000/butlers — the footer should still appear there (it was already present via the page itself; now it renders from layout — verify there's no duplicate. If there is, remove the footer import from `src/app/butlers/page.tsx` if it had one).

Note: `src/app/butlers/page.tsx` does NOT include `<Footer>` directly — confirmed. The layout will now supply it to both `/butlers` and `/butlers/[id]`.

**Step 3: Commit**

```bash
git add src/app/butlers/layout.tsx
git commit -m "fix: add Footer to all butler pages via butlers layout"
```

---

## Task 8: Fix Next.js Image `sizes` prop on butler cards

**Why:** All 6 butler card images generate console warnings about missing `sizes` prop. This can cause oversized image downloads and affects LCP.

**Files:**
- Modify: `src/components/landing/ButlerCategoryGrid.tsx`

---

**Step 1: Add `sizes` prop to the butler card Image**

In `src/components/landing/ButlerCategoryGrid.tsx`, find the `<Image>` component inside the card (around line 93) and add the `sizes` prop:

```tsx
<Image
  src={service.image}
  alt={`${service.name} background`}
  fill
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
  className="object-cover scale-105 group-hover:scale-100 transition-transform duration-1000 ease-out"
/>
```

**Step 2: Verify**

Navigate to http://localhost:3000/butlers — open DevTools Console. The 6 image warnings should no longer appear.

**Step 3: Commit**

```bash
git add src/components/landing/ButlerCategoryGrid.tsx
git commit -m "fix: add sizes prop to butler card images to resolve Next.js Image warnings"
```

---

## Final: Run full test suite and verify

**Step 1: Run all tests**

```bash
npm run test:run
```

Expected: all tests pass with no failures.

**Step 2: Build check**

```bash
npm run build
```

Expected: successful build with no errors (warnings acceptable).

**Step 3: Visual smoke test**

Check these pages:
- [ ] http://localhost:3000 — hero with subtitle and two CTAs, HowItWorks, ButlerCategoryGrid, Footer
- [ ] http://localhost:3000/butlers — header, hero, HowItWorks, 6 cards, footer
- [ ] http://localhost:3000/butlers/busy — header, hero, trust strip, service selector, booking form with visible labels, common requests, footer
- [ ] http://localhost:3000/members/login — title "Sign In | Butlers Inc." in browser tab
- [ ] http://localhost:3000/members/signup — title "Join | Butlers Inc." in browser tab

---

## Summary of Changes

| Task | File(s) | Type |
|------|---------|------|
| 1 | `src/app/page.tsx` | Composition |
| 2 | `src/components/landing/Hero.tsx` | Redesign |
| 3 | `src/components/booking/BookingForm.tsx` + test | Accessibility fix |
| 4 | `src/app/members/dashboard/page.tsx` | Data display fix |
| 5 | `src/app/globals.css` | CSS fix |
| 6 | `src/app/members/login/` + `signup/` | Server/client split |
| 7 | `src/app/butlers/layout.tsx` | Layout fix |
| 8 | `src/components/landing/ButlerCategoryGrid.tsx` | Performance fix |
