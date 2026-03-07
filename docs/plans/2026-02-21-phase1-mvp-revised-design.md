# Butlers Inc. Phase 1 MVP -- Revised Design

> Date: 2026-02-21
> Status: Pending approval
> Branch: `non-member-user-journey`
> Based on: Gap analysis of `docs/implementation-plan.md` vs. Faridah's founder emails
> Approach: **Test-Driven Development (TDD)**

---

## What This Document Is

This is a corrected and validated design for Phase 1, resolving all misalignments found between the original implementation plan and the founder's emails. Every correction is traced back to Faridah's exact words.

---

## Corrections Summary

| # | Issue | Original Plan | Corrected To | Source |
|---|-------|--------------|--------------|--------|
| 1 | Day pricing tiers | 5 tiers (Today £70, Tomorrow £55, Particular Day £45, This Week £35, Next Week £25) | **3 tiers** (Same Day £70, Next Day £55, 72hrs+ £35) | Email 1: "Budget starts from £35 ph where 72 hours notice is given, Everything else starts from £55 one day in advance, Same day starts from £70" |
| 2 | Website base price | "from £25/hr" | **"from £35/hr"** | Email 1: "I guess the website just says starts from £35 per hour" |
| 3 | services.ts priceFrom | All set to £25 | All set to **£35** (Bespoke stays "Quote") | Same as above |
| 4 | Booking flow steps | 5 separate full-screen steps (Service → Day → Time → Contact → Confirm) | **2 phases**: service selection click + combined booking form | Email 2: "maximum of 3 boxes before they get where they want" |
| 5 | 3-click rule | Violated (6+ clicks to form) | **Enforced**: Non-Members → Butler → Service → Form | Same as above |
| 6 | Member UX scope | 2-line stub placeholder | Architecture acknowledged; auth designed to accommodate Virtual/Personal Butler split | Email 2: "Virtual butler vs Personal butler" with specific service lists |
| 7 | Bougie Butler name | Hardcoded | **Configurable string** in data layer for easy rename | Email 1: "Bougie... or Billionaire Butler" |

---

## Architecture Overview

```
LANDING PAGE (/)
  Header (auth-aware: Login/Join or Username/Dashboard)
  Hero (Members | Non-Members segmented control)
  ButlerCategoryGrid (6 clickable boxes, "from £35/hr")
  Footer (simplified)

├── [Non-Members] → scroll to #butler-categories
│   Click butler box → /butlers/:category
│   └── ButlerBookingPage:
│       Phase 1: ServiceOptionSelector (clickable cards)     ← 3rd click
│       Phase 2: BookingForm (day + time + contact + submit) ← form, not clicks
│       → Submit → /booking-confirmation
│
├── [Members] → /members/login → /members/dashboard
│   └── Phase 1: Auth + minimal dashboard (booking history)
│   └── Phase 2+: Virtual Butler vs Personal Butler flow
│
Click path for non-members:
  (1) "Non-Members" on Hero → scrolls to butler grid
  (2) Click a butler box → /butlers/busy
  (3) Click a service option → form appears below
  = 3 clicks to "where they want" (the form)
```

---

## Data Layer

### Corrected Pricing: `src/data/booking-config.ts`

```typescript
export const DAY_OPTIONS = [
  { key: 'sameDay', label: 'Same Day', priceLabel: 'from £70/hr', priceFrom: 70 },
  { key: 'nextDay', label: 'Next Day', priceLabel: 'from £55/hr', priceFrom: 55 },
  { key: 'advance', label: '72+ Hours Notice', priceLabel: 'from £35/hr', priceFrom: 35, requiresDatePicker: true },
] as const;

export const TIME_SLOTS = [
  { key: 'morning', label: 'Morning', times: '7:00 - 11:59' },
  { key: 'noon', label: 'Noon', times: '12:00 - 16:59' },
  { key: 'evening', label: 'Evening', times: '17:00 - 21:00' },
] as const;

export type DayOptionKey = typeof DAY_OPTIONS[number]['key'];
export type TimeSlotKey = typeof TIME_SLOTS[number]['key'];
```

Key differences from original plan:
- **3 day options**, not 5
- `sameDay`/`nextDay`/`advance` keys (not today/tomorrow/particularDay/thisWeek/nextWeek)
- Only `advance` (72hrs+) requires a date picker
- Prices: 70 / 55 / 35 (not 70 / 55 / 45 / 35 / 25)

### Butler Name Configuration

The butler display name should be sourced from a single location so renaming (Bougie → Billionaire → Beau Monde) is a one-line change:

```typescript
// In src/data/services.ts - the SINGLE source of truth for butler names
{ id: "bougie", name: "Bougie Butler", ... }
// Change to "Billionaire Butler" here and it propagates everywhere
```

All components must reference `service.name` from the services data, never hardcode "Bougie Butler" as a string literal.

### services.ts Price Update

```typescript
// ALL butler types get priceFrom: '£35' (from £35/hr for 72hrs+ bookings)
// Bespoke stays 'Quote'
```

### butler-tasks.ts Updates

Per Faridah's email:
- **Busy**: Courier service, Errands, Custom services (replaces: Courier/delivery, Document pickup, Urgent shopping)
- **Bougie**: Luxury sourcing, Cross-country shopping, Rare item collection (replaces: Luxury sourcing, VIP event access, Exclusive reservations)
- **Others**: Keep current tasks (awaiting Faridah's email with expanded options)
- Remove import dependency on `pricing-config.ts`

---

## Booking Flow (Non-Members)

### Phase 1: Service Selection (click-based)

When user navigates to `/butlers/:category`, the page shows:
- Compact butler hero (name, subtitle, accent color)
- **ServiceOptionSelector**: clickable glass-morphism cards showing the butler's service options

Clicking a service card reveals Phase 2 (the form) below on the same page, with a smooth scroll/animation. This is the 3rd click -- they're now "where they want."

### Phase 2: Booking Form (single form page)

After service selection, the form appears with these sections stacked vertically:

```
┌─────────────────────────────────────────┐
│  Selected: Courier Service  [✕ change]  │
├─────────────────────────────────────────┤
│                                         │
│  WHEN DO YOU NEED THIS?                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐│
│  │ Same Day │ │ Next Day │ │ 72+ Hrs  ││
│  │ from £70 │ │ from £55 │ │ from £35 ││
│  └──────────┘ └──────────┘ └──────────┘│
│                                         │
│  [Date picker appears if "72+ Hrs"]     │
│                                         │
│  PREFERRED TIME                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐│
│  │ Morning  │ │  Noon    │ │ Evening  ││
│  │ 7-11:59  │ │ 12-16:59 │ │ 17-21:00 ││
│  └──────────┘ └──────────┘ └──────────┘│
│                                         │
│  YOUR DETAILS                           │
│  Name:  [________________]              │
│  Email: [________________]              │
│  Phone: [________________]              │
│  Notes: [________________] (optional)   │
│                                         │
│  [  Submit Booking Request  ]           │
│                                         │
└─────────────────────────────────────────┘
```

The Day and Time cards are **styled as clickable boxes** (matching the "boxes everywhere" directive) but they're **form controls within a single page**, not separate navigation steps.

### Form Validation (Zod)

```typescript
const bookingFormSchema = z.object({
  dayOption: z.enum(['sameDay', 'nextDay', 'advance']),
  specificDate: z.date().optional(),  // required when dayOption === 'advance'
  timeSlot: z.enum(['morning', 'noon', 'evening']),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(10),
  notes: z.string().max(500).optional(),
}).refine(
  (data) => data.dayOption !== 'advance' || data.specificDate !== undefined,
  { message: 'Please select a date', path: ['specificDate'] }
);
```

No postcode, no address, no duration -- founder collects these when she responds.

---

## Component Architecture

### New Components

| Component | Props | Behavior |
|-----------|-------|----------|
| `ServiceOptionSelector` | `butlerType`, `onSelect` | Renders task cards from `butler-tasks.ts`. Click calls `onSelect(taskKey)`. Bespoke shows textarea. |
| `BookingForm` | `butlerType`, `selectedService` | Single form with Day cards, Time cards, Contact fields. Validates with Zod + React Hook Form. Submits via `sendBooking()`. |
| `BookingFlow` | `butlerType` | Orchestrator: shows ServiceOptionSelector, then BookingForm after selection. Manages local state. Framer-motion transitions between phases. |

### Simplified BookingContext

With the combined form approach, `BookingContext` becomes much simpler. The multi-step reducer from the original plan is over-engineered for a 2-phase flow:

```typescript
// Option A: Just use local state in BookingFlow (recommended for simplicity)
const [selectedService, setSelectedService] = useState<string | null>(null);

// The form itself uses React Hook Form's internal state
// No need for a context provider wrapping the entire app
```

If we still want `BookingContext` (for the confirmation page to read from), it only needs:
- `butlerType` (from URL param)
- `serviceOption` (from card click)
- `formData` (from form submission)

Actions reduced from 7 (`SET_BUTLER_TYPE`, `SET_SERVICE_OPTION`, `SET_DAY_OPTION`, `SET_SPECIFIC_DATE`, `SET_TIME_SLOT`, `SET_CONTACT`, `RESET`) to 3 (`SET_SERVICE`, `SET_FORM_DATA`, `RESET`).

### ButlerBookingPage (Dynamic)

Single page component at `/butlers/:category`:
```typescript
// Reads :category from useParams()
// Validates against known butler types
// Renders compact hero + BookingFlow
// Full dark theme (bg-charcoal)
```

Replaces 6 individual butler pages (BusyButlerPage through BespokeButlerPage).

---

## Member Pages (Phase 1 Scope)

Phase 1 delivers auth + minimal dashboard. But the architecture must be designed to accommodate the full member experience Faridah described:

```
Members → Login → Dashboard
  Dashboard shows:
    - Booking history (from Supabase)
    - [Phase 2] Virtual Butler vs Personal Butler choice
    - [Phase 2] Membership tier info + "first 2 hours free" tracking
```

### Auth Flow
- `AuthProvider` wrapping the app
- `useAuth()` hook: `user`, `session`, `signUp()`, `signIn()`, `signOut()`, `loading`
- `ProtectedRoute` component for guarded routes
- Supabase Auth (email/password)

### Pages
- `/members/login` - LoginPage (dark theme, email/password)
- `/members/signup` - SignUpPage (dark theme, name/email/password/phone)
- `/members/dashboard` - MemberDashboard (protected, shows booking history)

### Phase 2 Member Architecture (Design Only, Not Implemented)

Documenting for future reference based on Faridah's email:

```
Dashboard
├── Virtual Butler (3 tiers)
│   ├── Flight booking
│   ├── Hotel booking
│   ├── Appointment scheduling
│   └── Travel itineraries
│
├── Personal Butler (3 tiers)
│   ├── Courier services
│   ├── Luxury sourcing
│   └── Home services
│
└── Membership: first 2 hours free per task
```

The existing `membership-tiers.ts` (Light/Standard/Premium with credits) will need to be restructured in Phase 2 to align with Virtual Butler tiers and Personal Butler tiers. Not touching it in Phase 1.

---

## Landing Page Simplification

### Index.tsx

**Before:** Header + Hero + ButlerCategoryGrid + HowItWorks + ServiceDetails + Membership + TrustSafety + Testimonials + FAQ + Footer + StickyBookingBar

**After:** Header + Hero + ButlerCategoryGrid + Footer

Remove all verbose informational sections. "More clicking, less reading."

### Header.tsx

- "Log in" → `<Link to="/members/login">`
- "Join" → `<Link to="/members/signup">`
- When authenticated: show user name + "Dashboard" link

### Hero.tsx

- "Members" → navigates to `/members/login`
- "Non-Members" → scrolls to `#butler-categories`
- Subtitle: "Across England. From £35/hr."

### ButlerCategoryGrid.tsx

- Remove `onCategorySelect` prop
- Price displays show "from £35/hr" (sourced from services data)

### Footer.tsx

- Simplified: logo, butler links, contact email, legal links
- Remove "Company" column
- Copyright 2026

---

## Email / Booking Submission

### send-booking.ts

```typescript
interface BookingPayload {
  butlerType: string;
  serviceOption: string;
  dayOption: 'sameDay' | 'nextDay' | 'advance';  // 3 options, not 5
  specificDate?: string;  // only when dayOption === 'advance'
  timeSlot: 'morning' | 'noon' | 'evening';
  name: string;
  email: string;
  phone: string;
  notes?: string;
}
```

- Generates `BT-XXXXXXXX` reference
- Inserts into Supabase `bookings` table
- Calls Edge Function to send email via Resend
- Attaches `user_id` if logged in, `null` if guest
- Validates `dayOption` against allowed enum values

### Supabase Edge Function

- Sends formatted HTML email to `bookings@butlersinc.co.uk`
- Sends confirmation email to customer
- Returns booking reference

---

## Route Structure

```typescript
/                        → Index (simplified landing)
/butlers                 → ButlersPage (directory grid)
/butlers/:category       → ButlerBookingPage (dynamic, validates category)
/members/login           → LoginPage (lazy)
/members/signup          → SignUpPage (lazy)
/members/dashboard       → ProtectedRoute → MemberDashboard (lazy)
/booking-confirmation    → BookingConfirmation
/reserve/busy            → Redirect → /butlers/busy
*                        → NotFound
```

---

## TDD Strategy

### Test Setup (Same as Original Plan)

Vitest + Testing Library + jsdom. The setup is correct in the original plan.

### Corrected Test Assertions

**`booking-config.test.ts`** -- must assert:
- `DAY_OPTIONS` has **3** entries (not 5)
- Keys are `sameDay`, `nextDay`, `advance`
- Prices are 70, 55, 35 (not 70, 55, 45, 35, 25)
- Only `advance` has `requiresDatePicker: true`
- `TIME_SLOTS` has 3 entries (unchanged)

**`BookingFlow.test.tsx`** -- must assert:
- Phase 1 renders ServiceOptionSelector
- After selecting service, Phase 2 (BookingForm) appears on same page
- BookingForm renders Day cards, Time cards, and Contact fields together
- Back button returns to service selection (Phase 1)
- Does NOT navigate to separate Day/Time pages
- **Integration test**: from service click to form visible = 0 navigation events

**`BookingForm.test.tsx`** (new, replaces separate Day/Time/Contact tests):
- Renders 3 day option cards (Same Day, Next Day, 72+ Hours)
- Renders 3 time slot cards (Morning, Noon, Evening)
- Renders name, email, phone, notes fields
- Clicking "72+ Hours Notice" reveals date picker
- Validates required fields
- Submit dispatches `sendBooking()` with correct payload
- No postcode, no address, no duration fields

**`services.test.ts`** -- should assert:
- All non-bespoke services have `priceFrom: '£35'`
- Bespoke has `priceFrom: 'Quote'`

**3-click rule E2E test** (Playwright):
- Navigate to `/`
- Click "Non-Members" (scroll)
- Click a butler box (navigate)
- Click a service option (form appears)
- Assert form is visible
- Total navigation events = 1 (only the butler box click triggers a route change)

### TDD Workflow Per Feature

```
1. RED:    Write failing test describing expected behavior
2. GREEN:  Write minimum code to pass
3. REFACTOR: Clean up, keep tests green
4. VERIFY: npm run test:run (all green)
5. VISUAL: npm run dev (check in browser)
```

---

## Files Inventory (Revised)

### New Files to Create (16 files)

| # | File | Purpose |
|---|------|---------|
| 1 | `vitest.config.ts` | Test configuration |
| 2 | `src/test/setup.ts` | Testing library setup |
| 3 | `src/test/test-utils.tsx` | Custom render with providers |
| 4 | `src/data/booking-config.ts` | 3-tier pricing, 3 time slots |
| 5 | `src/lib/supabase.ts` | Supabase client |
| 6 | `src/context/AuthContext.tsx` | Auth state provider |
| 7 | `src/components/auth/ProtectedRoute.tsx` | Route guard |
| 8 | `src/components/booking/ServiceOptionSelector.tsx` | Service cards (Phase 1) |
| 9 | `src/components/booking/BookingForm.tsx` | Combined day + time + contact form (Phase 2) |
| 10 | `src/components/booking/BookingFlow.tsx` | 2-phase orchestrator |
| 11 | `src/pages/butlers/ButlerBookingPage.tsx` | Dynamic butler booking page |
| 12 | `src/pages/members/LoginPage.tsx` | Login page |
| 13 | `src/pages/members/SignUpPage.tsx` | Registration page |
| 14 | `src/pages/members/MemberDashboard.tsx` | Member dashboard |
| 15 | `src/lib/send-booking.ts` | Booking submission + email trigger |
| 16 | `.env.local` | Supabase environment variables |

Removed from original plan:
- `src/components/booking/DaySelector.tsx` (merged into BookingForm)
- `src/components/booking/TimeSlotSelector.tsx` (merged into BookingForm)
- `src/components/booking/ContactForm.tsx` (merged into BookingForm)
- `src/data/member-services.ts` (deferred entirely to Phase 2)
- `src/context/BookingContext.tsx` (using local state in BookingFlow instead)

### Files to Modify (9 files)

| # | File | Key Changes |
|---|------|-------------|
| 1 | `package.json` | Add vitest, testing-library, @supabase/supabase-js |
| 2 | `src/App.tsx` | AuthProvider, Suspense, lazy imports, dynamic route, member routes |
| 3 | `src/pages/Index.tsx` | Strip to Header + Hero + ButlerCategoryGrid + Footer |
| 4 | `src/components/landing/Hero.tsx` | Members → /members/login, subtitle "From £35/hr" |
| 5 | `src/components/landing/Header.tsx` | Auth-aware nav |
| 6 | `src/components/landing/ButlerCategoryGrid.tsx` | Remove onCategorySelect prop |
| 7 | `src/components/landing/Footer.tsx` | Simplify, update year |
| 8 | `src/pages/BookingConfirmation.tsx` | Simplified data shape, no pricing breakdown |
| 9 | `src/data/services.ts` | priceFrom: '£35' for all (not £25) |
| 10 | `src/data/butler-tasks.ts` | Updated Busy + Bougie tasks, remove pricing-config import |

### Files to Delete (7 files)

Same as original plan -- the 6 static butler pages + BusyButlerReservation.tsx.

---

## Pending Decisions (For Faridah)

1. **Bougie Butler name**: Bougie vs. Billionaire vs. Beau Monde -- configurable in data layer, single-line change when decided
2. **Other butler tasks**: Faridah said she'd send tasks for Baby, Base, Budget, Bespoke -- keeping current tasks until received
3. **Member Virtual/Personal Butler service lists**: Faridah described examples but said "this is taking longer than I thought" -- full lists needed for Phase 2
4. **Membership tier pricing**: Current Light/Standard/Premium tiers don't match Virtual/Personal Butler structure -- needs founder input for Phase 2

---

## What's Deferred to Phase 2+

- Virtual Butler / Personal Butler member services
- Membership tiers restructure (Virtual 3 tiers + Personal 3 tiers)
- "First 2 hours free" mechanism
- Payment processing (Stripe Connect)
- Complex per-butler pricing
- Admin dashboard
- Bodycam streaming
- OAuth / magic link auth
- SMS notifications
- Butler profiles, availability, matching
- Reviews and ratings
