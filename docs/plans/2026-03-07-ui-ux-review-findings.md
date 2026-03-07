# UI/UX Review Findings — Home Page & Butler Pages

> **Date:** 2026-03-07
> **Branch:** `non-member-user-journey`
> **Status:** Pending implementation

---

## Overview

Comprehensive UI/UX review of the home page (`/`), butler listing page (`/butlers`), and individual butler detail pages (`/butlers/[id]`). Findings are prioritised by impact on conversion, brand consistency, and accessibility.

The codebase foundation is strong — cohesive colour system, distinctive typography pairing (Cormorant Garamond + Inter), enforced architectural geometry, and icon-free marketing. The gaps are primarily missing sections, navigation holes, and small deviations from the documented design system.

---

## Critical Issues

### 1. Hero Has No Primary CTA Button

**File:** `src/components/landing/Hero.tsx:24-87`

The hero section occupies the full viewport with headline + subtitle, but the only interactive elements are two underlined tab buttons (Non-Members / Members). There is no "Book Now", "Get Started", or "Browse Butlers" button.

The hero CTA utility classes (`hero-cta-solid`, `hero-cta-outline`) are defined in `src/app/globals.css:258-272` but never used anywhere in the codebase.

**Impact:** First-time visitors have no clear action to take. Conversion loss.

**Fix:**
- Add a primary CTA button below the subtitle using `hero-cta-solid`
- Add a secondary CTA using `hero-cta-outline`
- Keep the Non-Members / Members tabs as a secondary navigation element below the CTAs

---

### 2. Home Page Missing Core Sections

**File:** `src/app/page.tsx:6-17`

The entire home page is: Header, Hero, ButlerCategoryGrid, Footer. The design system's section background table (`docs/design-system.md:549-561`) documents planned sections that do not exist:

| Missing Section | Purpose |
|----------------|---------|
| How It Works | 3-step flow explaining the service |
| Trust & Safety | DBS checks, insurance, body-cam messaging |
| Testimonials | Social proof from customers |
| Membership Comparison | PAYG vs Member pricing |
| FAQ | Common questions with accordion UI |

A premium concierge service needs trust-building content before conversion. Currently there is no social proof, no pricing context, and no trust messaging on the home page.

**Fix:**
- Implement each section as a separate component in `src/components/landing/`
- Follow the alternating background pattern: cream, charcoal, ivory, charcoal
- Use patterns documented in `docs/design-system.md` (typographic numerals for How It Works, em-dash trust indicators, testimonial cards, accordion FAQ)

---

### 3. Butler Pages Missing Shared Navigation

**Files:** `src/app/butlers/page.tsx:12-55`, `src/app/butlers/[id]/page.tsx:101-167`

Neither the `/butlers` listing page nor individual butler detail pages render the shared `<Header />` or `<Footer />` components. They have a bare `<header>` element with text but no navigation. A user landing directly on `/butlers/busy` has no way to navigate to the home page except the browser back button.

The only escape hatch is a single "Explore other butlers" text link at the bottom of detail pages.

**Fix:**
- Import and render `<Header />` and `<Footer />` on both butler page layouts
- Alternatively, move Header/Footer into `src/app/layout.tsx` if they should appear on every page (requires checking member pages first)

---

## Medium Issues

### 4. `font-bold` on Headings Violates Design System

**Files:**
- `src/components/landing/Hero.tsx:33` — H1 uses `font-bold`
- `src/components/landing/ButlerCategoryGrid.tsx:38` — H2 uses `font-bold`
- `src/app/butlers/page.tsx:16` — H1 uses `font-bold`
- `src/app/butlers/[id]/page.tsx:112` — H1 uses `font-bold`

The design system specifies Cormorant Garamond headings should use `font-medium` (500 weight) as standard. Weight 700 (`font-bold`) is reserved for "strong emphasis" — not standard headings. The brand brief describes the tone as "understated luxury" — bold headings work against that.

**Fix:** Replace `font-bold` with `font-medium` on all heading elements listed above.

---

### 5. Butler Card Accent Colours Break Brand Palette

**File:** `src/components/landing/ButlerCategoryGrid.tsx:13-20`

The `CARD_ACCENTS` map uses orange, blue, rose, emerald, and violet gradients that do not exist in the brand colour palette. The brand brief states: "No bright colours or playful tones; muted palette projects mature confidence."

```tsx
// Current — rainbow accents
const CARD_ACCENTS: Record<ServiceId, string> = {
  busy: "from-orange-400/40 via-amber-500/20 to-transparent",
  baby: "from-blue-400/40 via-sky-300/20 to-transparent",
  bougie: "from-rose-400/40 via-pink-500/20 to-transparent",
  // ...
};
```

**Fix:** Replace with brass-family gradients at varying opacities, or use the per-butler `accentColor` values from `butler-page-configs.ts` which are more restrained (warm coral, soft blue, burgundy, etc.) but rendered at very low opacity.

---

### 6. Button `rounded-md` Violates Architectural Geometry

**File:** `src/components/ui/button.tsx:8`

The button base class uses `rounded-md` (6px radius). The design system prohibits any radius above `rounded-sm` (2px) or `rounded` (4px max). The `xs`, `sm`, and `lg` size variants also specify `rounded-md`.

**Fix:** Replace all `rounded-md` instances in the button component with `rounded-sm`.

---

### 7. Booking Form Uses sr-only Labels Only

**File:** `src/components/booking/BookingForm.tsx:188-254`

All form inputs use `sr-only` labels with only placeholder text visible. Placeholders disappear on focus and cannot communicate validation context. For a premium service, visible labels above inputs improve both UX and accessibility.

**Fix:** Convert `sr-only` labels to visible labels positioned above each input field. Style with `text-optical-white text-sm font-medium mb-1.5`.

---

### 8. Butler Card Images Not Lazy-Loaded

**File:** `src/components/landing/ButlerCategoryGrid.tsx:85-89`

The 6 butler service images in the category grid use `next/image` with `fill` but no `loading` attribute. These are below the fold (second section), so they should use `loading="lazy"` to avoid competing with the hero LCP.

**Fix:** Add `loading="lazy"` to the `<Image>` components inside the butler card grid.

---

### 9. Missing Skip-to-Content Link

**Files:** `src/app/page.tsx`, `src/app/layout.tsx`

The `<main id="main-content">` landmark exists but there is no visible skip link for keyboard users. This is acknowledged as a gap in `docs/design-system.md:656`.

**Fix:** Add a skip link as the first child of `<body>` in layout.tsx:

```tsx
<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[200] focus:px-4 focus:py-2 focus:bg-brass focus:text-charcoal focus:rounded-sm focus:text-sm focus:font-medium">
  Skip to content
</a>
```

---

## Low Issues

### 10. Template.tsx Double-Animation

**File:** `src/app/template.tsx:5-19`

The template wraps every page in a `motion.div` with fade-up animation (0.7s). But the Hero and ButlerCategoryGrid have their own entrance animations. This creates nested, competing motion — the page fades up while inner content also fades up independently.

**Fix:** Either remove the template animation, or remove individual component entrance animations and rely solely on the template transition. One orchestrated motion system, not two.

---

### 11. Bougie Butler Uses Placeholder Image Name

**File:** `src/data/services.ts:45`

The Bougie Butler references `nano-banana.png` as its service image. This appears to be a placeholder that was never swapped out.

**Fix:** Replace with an appropriately named image (e.g., `bougie-butler.png`) that matches the naming convention of other service images.

---

### 12. Footer Heading Font Weight

**File:** `src/components/landing/Footer.tsx:33,53`

Footer `<h4>` tags use `font-semibold` (600 weight). The brand brief notes 600 weight is "rarely used" for headings. While minor, consistency suggests using `font-medium` (500) here too.

**Fix:** Replace `font-semibold` with `font-medium` on footer heading elements.

---

## Implementation Order (Recommended)

| Phase | Issues | Effort |
|-------|--------|--------|
| **Phase 1: Navigation & CTA** | #1 (Hero CTA), #3 (Header/Footer on butler pages), #9 (Skip link) | Small |
| **Phase 2: Design System Compliance** | #4 (font-bold), #5 (accent colours), #6 (button radius), #12 (footer weight) | Small |
| **Phase 3: Home Page Sections** | #2 (How It Works, Trust, Testimonials, Membership, FAQ) | Large |
| **Phase 4: Polish** | #7 (form labels), #8 (lazy loading), #10 (template animation), #11 (image rename) | Small |

---

## Files Reviewed

| File | Type |
|------|------|
| `src/app/page.tsx` | Home page |
| `src/app/layout.tsx` | Root layout |
| `src/app/template.tsx` | Page transition wrapper |
| `src/app/butlers/page.tsx` | Butler listing page |
| `src/app/butlers/[id]/page.tsx` | Butler detail page |
| `src/components/landing/Hero.tsx` | Hero section |
| `src/components/landing/Header.tsx` | Site header |
| `src/components/landing/ButlerCategoryGrid.tsx` | Butler card grid |
| `src/components/landing/Footer.tsx` | Site footer |
| `src/components/ui/hero-background.tsx` | Hero background variants |
| `src/components/ui/button.tsx` | Button component |
| `src/components/butler-page-sections.tsx` | Butler page content sections |
| `src/components/booking/BookingFlow.tsx` | Booking flow orchestrator |
| `src/components/booking/ServiceOptionSelector.tsx` | Service task selector |
| `src/components/booking/BookingForm.tsx` | Booking form |
| `src/data/services.ts` | Service definitions |
| `src/data/butler-page-configs.ts` | Per-butler page configs |
| `src/app/globals.css` | Design tokens and utilities |
| `docs/brand-brief.md` | Brand reference |
| `docs/design-system.md` | Design system reference |
