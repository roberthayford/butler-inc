# Legal Pages Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create placeholder Privacy Policy and Terms of Service pages with branded "coming soon" messaging.

**Architecture:** Two static Server Components under a `(legal)` route group with a shared layout providing Header + Footer. No client JS, no interactivity.

**Tech Stack:** Next.js App Router, Tailwind CSS, React Server Components

---

### Task 1: Create shared legal layout

**Files:**
- Create: `src/app/(legal)/layout.tsx`

**Step 1: Create the layout file**

```tsx
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";

export default function LegalLayout({
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

**Step 2: Commit**

```bash
git add src/app/\(legal\)/layout.tsx
git commit -m "feat: add shared legal pages layout"
```

---

### Task 2: Create Privacy Policy page

**Files:**
- Create: `src/app/(legal)/privacy/page.tsx`

**Step 1: Create the page**

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-charcoal flex items-center justify-center px-6 py-24">
      <div className="max-w-xl text-center">
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-optical-white mb-6">
          Privacy Policy
        </h1>
        <p className="text-lg md:text-xl text-optical-white/90 font-serif italic mb-3">
          Our legal team is pressing the fine print.
        </p>
        <p className="text-warm-gray text-sm">
          This page will be updated shortly with our full policy.
        </p>
      </div>
    </main>
  );
}
```

**Step 2: Run dev server and verify at `http://localhost:3000/privacy`**

Expected: Page renders with title, headline, and subtitle centered on dark background.

**Step 3: Commit**

```bash
git add src/app/\(legal\)/privacy/page.tsx
git commit -m "feat: add placeholder privacy policy page"
```

---

### Task 3: Create Terms of Service page

**Files:**
- Create: `src/app/(legal)/terms/page.tsx`

**Step 1: Create the page**

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-charcoal flex items-center justify-center px-6 py-24">
      <div className="max-w-xl text-center">
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-optical-white mb-6">
          Terms of Service
        </h1>
        <p className="text-lg md:text-xl text-optical-white/90 font-serif italic mb-3">
          Our legal team is pressing the fine print.
        </p>
        <p className="text-warm-gray text-sm">
          This page will be updated shortly with our full policy.
        </p>
      </div>
    </main>
  );
}
```

**Step 2: Run dev server and verify at `http://localhost:3000/terms`**

Expected: Page renders with title, headline, and subtitle centered on dark background.

**Step 3: Commit**

```bash
git add src/app/\(legal\)/terms/page.tsx
git commit -m "feat: add placeholder terms of service page"
```

---

### Task 4: Verify footer links work

**Step 1: Navigate to any page with the footer (e.g., `/butlers`)**

Click "Privacy Policy" and "Terms of Service" links in the footer. Both should navigate to the new pages.

**Step 2: Run build to verify no errors**

```bash
npm run build
```

Expected: Clean build, no errors.
