# Hero CTA Layout Fix — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the unauthenticated AudienceCTA layout in the hero — remove faint borders, drop the price description from the left card, and align both CTA buttons to the same baseline.

**Architecture:** Single component edit to `AudienceCTA.tsx`. CSS grid equalises cell heights; `justify-between` pins buttons to the bottom of each column. A `border-r` hairline divides the two columns. No DOM additions.

**Tech Stack:** React 19, Tailwind CSS v4, Framer Motion (motion/react), Vitest + Testing Library

**Design doc:** `docs/plans/2026-03-21-hero-cta-layout-design.md`

---

### Task 1: Update the failing test to reflect removed description copy

The existing test does not assert on the description text that is being removed, so no test change is needed for that. However we should add a test that asserts the price copy is **not** present, to prevent regression.

**Files:**
- Modify: `src/components/landing/__tests__/AudienceCTA.test.tsx`

**Step 1: Add regression assertion to the existing "renders two cards" test**

Open `src/components/landing/__tests__/AudienceCTA.test.tsx`.

Inside the `"renders two cards when unauthenticated"` test (currently line 31), add this assertion after the existing `expect` calls:

```ts
expect(
  screen.queryByText(/Premium concierge across England from £35\/hr/i)
).not.toBeInTheDocument();
```

**Step 2: Run the test to verify it currently FAILS**

```bash
npm run test:run -- AudienceCTA
```

Expected: the new assertion fails because the text IS currently in the DOM.

---

### Task 2: Edit AudienceCTA — unauthenticated state

**Files:**
- Modify: `src/components/landing/AudienceCTA.tsx`

**Step 1: Replace the left card `motion.div` className and remove description**

Find this block (lines 51–70):

```tsx
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
```

Replace with:

```tsx
<motion.div
  initial={{ opacity: 0, y: 16 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, margin: "-60px" }}
  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
  className="p-8 flex flex-col justify-between border-r border-optical-white/15"
>
  <h2 className="text-xl font-serif font-bold text-optical-white">
    New to Butlers Inc.?
  </h2>
  <Link
    href="/butlers"
    className="self-start px-6 py-3 rounded-sm bg-brass text-charcoal font-medium hover:bg-brass-muted transition-colors text-sm tracking-wide"
  >
    Browse Our Butlers
  </Link>
</motion.div>
```

**Step 2: Replace the right card `motion.div` className**

Find this block (lines 72–91):

```tsx
<motion.div
  initial={{ opacity: 0, y: 16 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, margin: "-60px" }}
  transition={{ duration: 0.45, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
  className="border border-primary-foreground/10 rounded-sm p-8 flex flex-col gap-4"
>
```

Replace the `className` only:

```tsx
  className="p-8 flex flex-col justify-between"
```

**Step 3: Run the tests — expect all to pass**

```bash
npm run test:run -- AudienceCTA
```

Expected: 4 tests pass. The new regression assertion passes because the price copy is gone.

**Step 4: Commit**

```bash
git add src/components/landing/AudienceCTA.tsx src/components/landing/__tests__/AudienceCTA.test.tsx
git commit -m "fix: remove card borders and price copy from hero CTA, align buttons"
```

---

### Task 3: Visual verification in browser

**Step 1: Navigate to homepage**

The dev server should already be running at `http://localhost:3000`. Open it (or use Playwright).

**Step 2: Check the hero CTA block**

Confirm:
- [ ] No faint border boxes around either card
- [ ] Single hairline vertical divider between the two columns
- [ ] "Browse Our Butlers" (brass) and "Sign In" (ghost) buttons sit on the same horizontal baseline
- [ ] No price/description text in the left card
- [ ] Right card still shows "Pick up where you left off."
- [ ] On mobile (375px), cards stack vertically and divider is invisible (correct)

**Step 3: Run the full test suite**

```bash
npm run test:run
```

Expected: all tests pass.

**Step 4: Final commit if any follow-up tweaks were made**

```bash
git add -p
git commit -m "fix: hero CTA visual tweaks after browser review"
```
