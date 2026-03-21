# UI/UX Audit — Butlers Inc.
**Date:** 20 March 2026
**Auditor:** Internal
**Method:** Code review (all pages + components) + live browser inspection (desktop 1280px, mobile 375px)
**Framework:** `docs/ui-ux-evaluation-framework.md`

---

## Summary

**Overall Quality Rating: 6 / 10**

The site has a genuinely strong visual identity — Cormorant Garamond serif, charcoal/brass palette, architectural 1–2px radii, tasteful Framer Motion entrances. The design language is coherent and premium. However, the homepage barely functions as a landing page, the primary booking entry-point has a navigation anti-pattern, and there are multiple accessibility failures and data quality issues in the dashboard.

### Top 3 Strengths
1. **Design coherence** — The colour system (charcoal, brass, warm-gray, optical-white), type pairing (Cormorant + Inter), and 1px radius give the site a distinctive, premium character that is consistent across all pages.
2. **Animation quality** — Framer Motion entrance animations are tasteful, well-timed, and non-blocking. Stagger delays on grids are subtle but effective.
3. **Accessibility foundations** — `lang="en"`, `font-display: swap`, skip link (`#main-content`), ARIA labels on the mobile hamburger, Escape-key close for the mobile menu, and semantic `<fieldset>`/`<legend>` in the booking form are all solid.

### Top 3 Critical Issues
1. **Homepage is near-empty** — no value proposition, no butler discovery, no pricing. First-time visitors have almost no information to make a decision.
2. **Members/Non-Members tabs are a navigation anti-pattern** — they look like tabs but immediately redirect, which breaks user expectations and is confusing for new visitors.
3. **Booking form visible labels are all `sr-only`** — placeholders are used as labels, disappear on input, and fail WCAG 2.1 AA.

### Estimated Effort for Critical Issues
- Homepage content: **Medium** (add existing components, revise copy)
- Members/Non-Members pattern: **Low** (replace with two clear CTAs)
- Booking form labels: **Low** (remove `sr-only`, restructure layout slightly)

---

## Detailed Findings

---

### 1. Visual Hierarchy & Information Architecture

---

#### 1.1 — Homepage Has No Content or Value Proposition

**Severity:** 🔴 Critical
**Category:** Information Architecture / Conversion
**Location:** `/` — `src/app/page.tsx`, `src/components/landing/Hero.tsx`

**What was found:**
The homepage renders exactly: a full-screen hero with a single headline ("Your personal butler, on demand."), two tab-style buttons (Members / Non-Members), and the footer. That is the entire page. The `ButlerCategoryGrid` and `HowItWorks` components exist but are only rendered on `/butlers`. A first-time visitor landing on the homepage has:
- No explanation of what the service is
- No pricing
- No butler types or categories
- No "How it works" flow
- No social proof or trust signals
- No clear CTA that communicates what clicking will do

**Why it matters:**
Most new visitors will arrive at `/` via search, social, or word of mouth. They have seconds to decide whether to engage. Presenting a single headline and two mysterious buttons with no supporting context will result in high bounce rates. The content gap between homepage and `/butlers` is severe.

**Recommendation:**
Below the hero, add the existing sections in order:
1. `<HowItWorks />` (already exists)
2. `<ButlerCategoryGrid />` (already exists)

Separately, add a brief subtitle below the H1 in the Hero, e.g.: *"Premium concierge across England. From £35/hr."* — this gives pricing context immediately.

**Effort:** Low (composing existing components) + Low (copy change)

---

#### 1.2 — Members/Non-Members Tab Is a Navigation Anti-Pattern

**Severity:** 🔴 Critical
**Category:** Interaction Design / Information Architecture
**Location:** `src/components/landing/Hero.tsx`

**What was found:**
Two buttons styled as a segmented tab control (underline indicator, horizontal layout) immediately navigate away on click — "Members" → `/members/login`, "Non-Members" → `/butlers`. This violates the fundamental tab affordance: tabs reveal content in place, they do not navigate. Additionally:
- The labels "Members" vs "Non-Members" communicate nothing about the value proposition
- There is no supporting copy explaining what either option does
- A returning member clicking "Members" gets sent to a login wall — which is reasonable only if they already know that's what this means
- Non-members clicking "Members" by mistake get sent to login, get confused, and leave

**Why it matters:**
This is the only interactive element on the most important page of the site. It fails both new and returning users.

**Recommendation:**
Replace with two explicit CTAs and a brief supporting subtitle:

```
Subtitle: "Premium concierge for busy professionals. Same-day service across England."

[Browse Our Butlers]  (primary solid button → /butlers)
[Sign In / Join]      (secondary ghost button → /members/login)
```

Remove the tab affordance entirely. These are navigation actions, not tab panels.

**Effort:** Low

---

#### 1.3 — Trust Indicators Have No Visual Weight

**Severity:** 🟠 Major
**Category:** Visual Hierarchy / Signifiers
**Location:** `src/app/butlers/[id]/page.tsx` (trust indicators strip)

**What was found:**
Three genuinely strong selling points — "DBS checked and reference verified", "Insured for items up to £5,000", "Live GPS tracking on every delivery" — are rendered as small warm-gray text separated by em-dashes. They are visually indistinguishable from metadata. No icons, no separation, no visual weight.

**Why it matters:**
These are trust signals. They answer the "is this safe?" objection that every potential customer has. Burying them as fine print means most users won't notice them.

**Recommendation:**
Render each trust indicator as an icon + bold label layout:
```
🔒  DBS Checked     🛡  Insured to £5k     📍  GPS Tracked
```
Use a 3-column flex row, each with an icon (Lucide: `ShieldCheck`, `BadgeCheck`, `MapPin`), a short bold label, and optional sub-text. Give each item a small card treatment or at minimum adequate spacing.

**Effort:** Low

---

#### 1.4 — HowItWorks Steps Lack Descriptions

**Severity:** 🟡 Minor
**Category:** Information Architecture / Content
**Location:** `src/components/landing/HowItWorks.tsx`

**What was found:**
The four steps ("01 CHOOSE YOUR BUTLER SERVICE", "02 BOOK YOUR SLOT", "03 WE ARRIVE", "04 WE HAND OVER") are titles only, in uppercase, with no supporting body text. Users reading step "04 WE HAND OVER" cannot tell what is being handed over or to whom.

**Why it matters:**
The "How It Works" section is designed to reduce friction for new visitors. Steps without descriptions don't reduce friction — they create more questions.

**Recommendation:**
Add 1–2 lines of supporting copy per step:
- "01 — Select the butler type that matches your need — from urgent courier to luxury sourcing."
- "04 — Your butler delivers the completed task back to you, with confirmation and any relevant receipts."

**Effort:** Low

---

### 2. Layout & Grid

---

#### 2.1 — Butler Category Grid Image Warnings (LCP Risk)

**Severity:** 🟠 Major
**Category:** Performance / Layout
**Location:** `src/components/landing/ButlerCategoryGrid.tsx`

**What was found:**
All 6 butler card images generate the console warning: *"Image with src '/images/busy-butler.png' ... width and height not provided"* (or similar sizing mismatch). These images are used as atmospheric `fill` backgrounds within relatively-positioned containers, but the container sizing or aspect ratio is not constrained in a way Next.js Image can optimise for.

**Why it matters:**
Unoptimised `fill` images can cause layout shift (CLS) and slower LCP. On the `/butlers` page with 6 of them, this compounds.

**Recommendation:**
Ensure each card's outer container has an explicit `aspect-ratio` or fixed height so Next.js Image can infer sizing. Check `sizes` prop is set appropriately (e.g., `sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"`).

**Effort:** Low

---

### 3. Typography

---

#### 3.1 — Login Page Missing `<title>`

**Severity:** 🟡 Minor
**Category:** Content / SEO
**Location:** `src/app/members/login/page.tsx`

**What was found:**
The login page inherits the default layout title: "Butlers Inc. | Premium Concierge Service". There is no `export const metadata` overriding this. Same issue exists on `/members/signup`.

**Why it matters:**
Users with multiple tabs open, screen reader users, and search engines all rely on page titles to identify content. "Butlers Inc. | Premium Concierge Service" is the wrong title for a login form.

**Recommendation:**
Add to both pages:
```ts
export const metadata: Metadata = {
  title: "Sign In",  // renders as "Sign In | Butlers Inc." via template
};
```

**Effort:** Low (5 minutes)

---

### 4. Interaction Design & Feedback

---

#### 4.1 — Booking Form: No Visible Labels (WCAG AA Failure)

**Severity:** 🔴 Critical
**Category:** Accessibility / Forms
**Location:** `src/components/booking/BookingForm.tsx`

**What was found:**
The three contact fields (name, email, phone) and the notes textarea all use `sr-only` labels, with placeholder text as the only visible identifier:

```tsx
<label htmlFor="booking-name" className="sr-only">Full name</label>
<Input placeholder="Full name" ... />
```

Placeholders disappear as soon as the user starts typing, leaving the field with no visible indication of its purpose.

**Why it matters:**
- Fails **WCAG 2.1 SC 1.3.1** (Info and Relationships)
- Fails **WCAG 2.1 SC 1.3.5** (Identify Input Purpose)
- Sighted users who tab between fields mid-form have no way to know which field is which
- Users with cognitive disabilities are particularly affected

**Recommendation:**
Remove the `sr-only` class. Stack the label above the input (4–8px gap). The booking form uses a `space-y-3` layout that already supports this. The login/signup forms correctly use visible `FormLabel` — apply the same pattern here.

**Effort:** Low

---

#### 4.2 — Login Page: No "Forgot Password" Link

**Severity:** 🟠 Major
**Category:** Interaction Design / User Flows
**Location:** `src/app/members/login/page.tsx`

**What was found:**
The login form has email and password fields and a "Sign In" button, but no password reset pathway. A user who has forgotten their password has no visible recovery option.

**Why it matters:**
Password reset is a standard, expected feature on any login form. Its absence will cause permanent churn for users who can't recall their credentials.

**Recommendation:**
Add a "Forgot your password?" link below the password field, right-aligned:
```tsx
<div className="flex justify-end">
  <Link href="/members/reset-password" className="text-xs text-warm-gray hover:text-brass-text">
    Forgot your password?
  </Link>
</div>
```
This also requires implementing the password reset flow in Supabase Auth.

**Effort:** Medium (UI: Low; backend Supabase reset flow: Medium)

---

#### 4.3 — Submit Button Copy Is Generic

**Severity:** 🟡 Minor
**Category:** Content / Microcopy
**Location:** `src/components/booking/BookingForm.tsx`

**What was found:**
The booking form submit button reads "Submit Booking Request". The word "Submit" is the canonical example of weak button copy in the evaluation framework.

**Why it matters:**
Button labels should be action-oriented and outcome-specific. "Submit" tells users nothing about what happens next.

**Recommendation:**
Change to: **"Send Booking Request"** or **"Request Your Butler"**. On the loading state, "Sending your request..." is clearer than "Submitting...".

**Effort:** Low (minutes)

---

### 5. Navigation & Wayfinding

---

#### 5.1 — Butler Detail Pages Have No Footer

**Severity:** 🟠 Major
**Category:** Navigation / Consistency
**Location:** `src/app/butlers/[id]/page.tsx`

**What was found:**
Butler detail pages (e.g. `/butlers/busy`) end with a lone text link "Explore other butlers" and then nothing. There is no `<Footer>` component. This means no contact email, no legal links, no branding mark at page bottom. Contrast with `/butlers` and `/` which both include the footer.

**Why it matters:**
The butler detail page is likely the highest-traffic conversion page (it contains the booking form). Users who scroll past the form and common requests section hit a dead end. If they have a question, they can't find contact info without navigating away.

**Recommendation:**
Add `<Footer />` to the butler detail page, or include it via `src/app/butlers/layout.tsx` so all butler pages inherit it.

**Effort:** Low

---

#### 5.2 — Dashboard Header Is Inconsistent with Site Header

**Severity:** 🟡 Minor
**Category:** Consistency / Navigation
**Location:** `src/app/members/dashboard/page.tsx`

**What was found:**
The dashboard implements its own custom inline header (logo link + user email + Sign Out button) rather than using the shared `<Header>` component. The result is a different visual treatment — no nav links, different spacing, different feel.

**Why it matters:**
Inconsistent navigation patterns make users feel like they've left the main site. The dashboard should feel like a continuation of the brand experience, not a different application.

**Recommendation:**
Use the shared `<Header>` component, or create a dedicated authenticated variant that shows the nav links alongside the user account controls. The Sign Out should move to a user menu/dropdown rather than being a standalone button.

**Effort:** Medium

---

#### 5.3 — 404 Page Is Bare

**Severity:** 🟡 Minor
**Category:** Navigation / Error States
**Location:** `src/app/not-found.tsx`

**What was found:**
The 404 page is minimal — just a "404" heading, "This page doesn't exist." paragraph, and a "Back to Home" button. No header, no footer, no navigation, no helpful suggestions.

**Why it matters:**
A well-designed 404 page can recover users who arrive via broken links. Currently there is no way to navigate to `/butlers`, search, or contact support from a 404 state.

**Recommendation:**
Add the main header, a short helpful message ("We couldn't find that page."), and 2–3 navigation suggestions:
- Browse Our Butlers → `/butlers`
- Go to Homepage → `/`
- Contact us → `mailto:hello@butlersinc.com`

**Effort:** Low

---

### 6. Dashboard Data Quality

---

#### 6.1 — Dashboard Shows Raw Database Enum Values

**Severity:** 🟠 Major
**Category:** Content / Data Display
**Location:** `src/app/members/dashboard/page.tsx`

**What was found:**
Booking rows in the dashboard render raw database values directly:
```tsx
{booking.butler_type} Butler — {booking.reference}
{booking.service_option ?? "Custom request"} • {booking.day_option} • {booking.time_slot}
```
So a user sees: **"busy Butler — REF123"** and **"Courier and package services • advance • morning"**

- `butler_type: "busy"` should display as "Busy Butler"
- `day_option: "advance"` should display as "Advance Booking" or the specific date
- `time_slot: "morning"` should display as "Morning (8am–12pm)"
- No booking date is shown at all — only `created_at` is available in the query but not rendered

**Why it matters:**
Users see internal system terminology, not meaningful information. "advance • morning" tells them nothing about when their butler is booked.

**Recommendation:**
Create display label mappings:
```ts
const DAY_LABELS = { sameDay: "Same Day", nextDay: "Next Day", advance: "Advance" };
const TIME_LABELS = { morning: "Morning (8am–12pm)", noon: "Midday (12pm–4pm)", evening: "Evening (4pm–8pm)" };
const BUTLER_LABELS = { busy: "Busy Butler", baby: "Baby Butler", ... };
```
Show the booking's `created_at` date formatted (e.g., "19 March 2026") as a third row or as a label.

**Effort:** Low

---

### 7. Accessibility

---

#### 7.1 — `prefers-reduced-motion` Not Handled in CSS Keyframes

**Severity:** 🟡 Minor
**Category:** Accessibility / Animation
**Location:** `src/app/globals.css`

**What was found:**
Three custom CSS keyframe animations are defined (`fade-up`, `fade-in`, `accordion-down/up`) and used via `@apply animate-fade-up`. The global CSS does not include a `@media (prefers-reduced-motion: reduce)` block to disable or reduce these. Framer Motion respects this preference natively for its own animations, but CSS keyframe animations applied via class names do not.

**Why it matters:**
Users with vestibular disorders or motion sensitivity who have set "Reduce Motion" in their OS will still experience the CSS keyframe animations. This fails WCAG 2.1 SC 2.3.3 (Animation from Interactions, AAA) and is a best-practice violation at AA level.

**Recommendation:**
Add to `globals.css`:
```css
@media (prefers-reduced-motion: reduce) {
  .animate-fade-up, .animate-fade-up-slow, .animate-fade-in {
    animation: none;
    opacity: 1;
    transform: none;
  }
}
```

**Effort:** Low (5 minutes)

---

#### 7.2 — Console Hydration Error on Every Page

**Severity:** 🟠 Major
**Category:** Technical / Accessibility
**Location:** All pages

**What was found:**
Every page load produces the console error: *"A tree hydrated but some attributes of the server-rendered HTML didn't match the client properties."* This was observed on `/`, `/butlers`, `/butlers/busy`, and `/members/login`.

**Why it matters:**
Hydration mismatches can cause React to re-render the entire tree client-side, resulting in flash-of-content issues, accessibility tree corruption (screen readers may read incorrect content), and degraded performance. The most common cause is the `useAuth` hook or a browser extension, but it should be investigated to rule out a genuine server/client divergence.

**Recommendation:**
Inspect the error detail in browser DevTools to identify which element mismatches. Common culprits: browser extensions adding attributes, `Date.now()` or `Math.random()` in render, or the `useAuth` state causing the header to render differently. Wrap any conditionally-rendered auth-dependent content in a `useEffect`-based client flag if needed.

**Effort:** Medium (investigation + fix)

---

### 8. Empty States

---

#### 8.1 — Dashboard Empty State Is Functional But Plain

**Severity:** 🟡 Minor
**Category:** Empty States
**Location:** `src/app/members/dashboard/page.tsx`

**What was found:**
The empty bookings state shows: "No bookings yet." with a "Book a Butler" CTA button, inside a card. It works, but has no illustration, no warmth, and the copy doesn't reinforce the brand voice.

**Why it matters:**
For a premium concierge brand, the empty state is an opportunity to reinforce the service promise. "No bookings yet." is transactional, not inviting.

**Recommendation:**
Add a simple icon (e.g., `ConciergeBell` from Lucide) and improve copy:
```
[🛎 icon]
"Your butler awaits."
"You haven't made any bookings yet. Browse our specialist butlers to get started."
[Browse Butlers →]
```

**Effort:** Low

---

### 9. Booking Page — Missing Pricing Context

**Severity:** 🟠 Major
**Category:** Information Architecture / Conversion
**Location:** `src/app/butlers/[id]/page.tsx`

**What was found:**
The butler detail page — which is where users commit to a booking — shows no price anywhere. The hero, trust indicators, and booking form all omit pricing. The footer copy "From £35/hr" only appears in the metadata description, which is invisible to users. The booking form doesn't even tell users what "same day" or "advance" pricing means (those labels exist in the `BookingForm` as `priceLabel` on the day option buttons — `{opt.priceLabel}` — but this relies on data from `DAY_OPTIONS` which I haven't verified is populated).

**Why it matters:**
Asking a user to fill out a form without knowing the cost is a major conversion barrier. Users who feel surprised by pricing after submission will not return.

**Recommendation:**
Add a price line to the hero section of each butler page: *"From £35/hr — no hidden fees"*. Verify `DAY_OPTIONS` has the `priceLabel` populated so users see pricing on the urgency selector. Consider adding a brief pricing table or FAQ accordion below the booking form.

**Effort:** Low–Medium

---

## Prioritised Action Plan

### Quick Wins — Do These First (Low Effort, High Impact)

| # | Finding | Location | Effort |
|---|---------|----------|--------|
| 1 | Add `<HowItWorks>` and `<ButlerCategoryGrid>` to homepage | `src/app/page.tsx` | 15 min |
| 2 | Replace Members/Non-Members tabs with two clear CTAs | `Hero.tsx` | 30 min |
| 3 | Add hero subtitle with pricing ("From £35/hr") | `Hero.tsx` | 10 min |
| 4 | Remove `sr-only` from booking form labels | `BookingForm.tsx` | 15 min |
| 5 | Add login/signup page `<title>` metadata | `login/page.tsx`, `signup/page.tsx` | 5 min |
| 6 | Fix dashboard raw enum display values | `dashboard/page.tsx` | 30 min |
| 7 | Add `prefers-reduced-motion` to global CSS | `globals.css` | 5 min |
| 8 | Fix `Next.js Image` `sizes` prop on butler cards | `ButlerCategoryGrid.tsx` | 20 min |
| 9 | Improve booking submit button copy | `BookingForm.tsx` | 5 min |
| 10 | Add `<Footer />` to butler detail pages | `app/butlers/[id]/page.tsx` or `butlers/layout.tsx` | 10 min |

---

### Strategic Improvements (Medium Effort, High Impact)

| # | Finding | Notes |
|---|---------|-------|
| 1 | Add "Forgot Password" link + Supabase reset flow | Needs both UI and backend |
| 2 | Investigate and fix hydration error | Debug then fix root cause |
| 3 | Upgrade trust indicators with icons + card treatment | Redesign the trust strip |
| 4 | Add pricing context to butler detail hero | May require data model change |
| 5 | Improve dashboard header consistency | Authenticated `<Header>` variant |

---

### Polish Items (Low Effort, Low Impact)

| # | Finding |
|---|---------|
| 1 | 404 page: add header + nav suggestions |
| 2 | HowItWorks: add descriptions to each step |
| 3 | Dashboard empty state: icon + improved copy |

---

### Major Refactors (High Effort, High Impact)

| # | Finding |
|---|---------|
| 1 | Dashboard: add booking detail view, cancellation, rebooking |
| 2 | Homepage: consider a properly structured landing page with pricing section and social proof |

---

## Quick Audit Checklist

### Visual Design
- [x] Consistent colour palette with semantic usage
- [x] Consistent component styling across pages
- [ ] **Clear visual hierarchy — primary content immediately obvious** ❌ (homepage fails)
- [x] Consistent spacing
- [x] Typography scale with tightened header letter-spacing

### Interaction Design
- [x] Buttons have hover, active, disabled states (where applicable)
- [x] Forms have validation with error messages (login/signup)
- [ ] **Booking form visible labels** ❌ (`sr-only` only)
- [x] Loading states shown (booking form, dashboard)
- [ ] **Destructive actions require confirmation** — N/A for current features
- [ ] **"Forgot password" on login** ❌

### Accessibility
- [x] `lang="en"` on `<html>`
- [x] ARIA labels on interactive elements (mobile menu)
- [x] Keyboard navigation (Escape key, focus management)
- [ ] **WCAG AA visible labels on booking form** ❌
- [ ] **`prefers-reduced-motion` for CSS keyframes** ❌

### Responsiveness
- [x] Layout works from 375px to 1280px (no overflow)
- [x] Mobile hamburger menu functions correctly
- [x] Touch targets adequate (hamburger, CTAs)
- [x] No horizontal scrolling observed

### Content
- [x] Action-oriented button labels (mostly)
- [ ] **Meaningful homepage content** ❌
- [ ] **Pricing context on booking pages** ❌
- [ ] **`<title>` tags on all pages** ❌ (login, signup)

### Performance
- [ ] **Image `sizes` prop on butler cards** — warnings in console
- [x] Dynamic import on BookingFlow (heavy component)
- [x] `font-display: swap` configured
- [ ] **Hydration error** — console error on all pages

---

*Audit conducted against `docs/ui-ux-evaluation-framework.md`. All severity ratings per framework: 🔴 Critical, 🟠 Major, 🟡 Minor, 🟢 Pass.*
