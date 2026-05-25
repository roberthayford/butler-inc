# Logged-in Navigation Coverage — Design

**Date:** 2026-05-25
**Branch (target):** `staging`
**Status:** Draft, awaiting user review

## Problem

Smoke testing surfaced that several internal and logged-in pages render with no global navigation: a member on `/members/dashboard`, `/members/settings`, `/members/personal-butler`, `/members/virtual-butler`, `/membership`, `/members/checkout/success`, or `/booking-confirmation` has no header to navigate from. Some pages render a bespoke inline header (dashboard: logo + welcome banner + Settings link + Sign Out). Others render only a `← Back to Dashboard` link. The result is inconsistent wayfinding and several dead-end pages.

## Decisions

These were settled during brainstorming and drive the design below:

1. **Same auth-aware global Header on every internal page** (not a separate "app shell").
2. **Replace bespoke per-page headers and back links entirely** with the global Header.
3. **Coverage:** all `/members/*` (including login, signup, `checkout/success`), `/membership`, `/booking-confirmation`.
4. **Footer too:** every page that gets the Header also gets the Footer.
5. **Per-segment layouts** (matches existing `/butlers` and `/(legal)` pattern), not a single `(app)` route group.
6. **Sign Out lives in an account menu inside the Header**, not on a settings page.
7. **Auth pages suppress Sign In / Join CTAs** in the Header (logo + Home + Our Butlers remain).

## Out of scope

- Sub-project #2 (dashboard "Book a Butler" CTA bug at `src/app/members/dashboard/page.tsx:206`) ships as a separate small PR. Optional to bundle if it makes the diff cleaner; default is separate.
- Sub-project #1 (post-signup confirmation page) — separate brainstorm cycle.
- Sub-project #3 (membership lifecycle confirmations) — separate brainstorm cycle.
- `/admin` page header treatment.
- Footer component itself — used as-is, no edits.
- Skip-to-content link, visual regression testing, Percy/Playwright — none of these are in the current test stack.
- `<SiteShell>` extraction — deferred per YAGNI; trigger condition is "a fourth layout adopts the same pattern, or Header injection logic grows."

## Architecture

### Layout files

| File | Action | Body |
|---|---|---|
| `src/app/members/layout.tsx` | Edit | `<><Header /><main className="pt-20">{children}</main><Footer /></>` |
| `src/app/membership/layout.tsx` | Create | Same pattern |
| `src/app/booking-confirmation/layout.tsx` | Create | Same pattern |
| `src/app/butlers/layout.tsx` | No change | Already follows the pattern |
| `src/app/(legal)/layout.tsx` | No change | Already follows the pattern |
| `src/app/layout.tsx` | No change | Stays bare (Providers + GenieStickyBar) |
| `src/app/page.tsx` | No change | Keeps inline `<Header />` + `<Footer />` (homepage convention) |

### Top-padding for the fixed Header

The Header is `fixed top-0` (`src/components/landing/Header.tsx:42-45`) with `py-4` and a serif logo, measured at ~72-80px. Each new/edited layout wraps `{children}` in `<main className="pt-20">`. Page bodies stay unchanged. If a particular page's existing top padding now stacks visibly during QA, drop the *page's* padding rather than the layout's (single source of truth at the layout).

### Header component (`src/components/landing/Header.tsx`) — changes

- **Auth-page CTA suppression.** Add `usePathname()` and hide the `Sign In` and `Join` links when pathname is `/members/login` or `/members/signup`. Logo, Home, Our Butlers all remain visible.
- **Replace the Dashboard button with `<AccountMenu />`** for logged-in users (lines 80-85 desktop, 158-164 mobile). The current `Dashboard` link becomes the first item *inside* the AccountMenu dropdown.
- Header stays `"use client"`. No SSR/CSR mismatch concerns — pathname-conditional rendering happens after hydration; pages affected are infrequent and any flash is sub-100ms. If QA finds the flash visually jarring, mitigate with a `data-pathname` attribute set by a tiny inline script (not built unless needed).

### New component: `<AccountMenu />`

- **Location:** `src/components/landing/AccountMenu.tsx`. Client component.
- **Props:** none. Reads `useAuth()` for `user` and `signOut`; reads `isAdmin(user.email)` for admin item visibility.
- **Renders nothing if `!user`** — the logged-out CTA branch of Header continues to handle that case.
- **Desktop trigger:** 36px circular button with brass border, containing the first letter of the user's email (or initials from name if available). Opens a dropdown anchored to the trigger.
- **Dropdown items (in order):** Dashboard, Settings, Admin *(only if `isAdmin`)*, divider, Sign Out.
- **Mobile:** rendered inline inside the existing mobile menu sheet — same items as plain links, no nested popover.
- **Sign Out:** `await signOut()` → toast `"Signed out"` → `router.push("/")`. On failure, toast `"Sign out failed. Try again."` and stay on current page.
- **A11y:** trigger `<button aria-haspopup="menu" aria-expanded="…" aria-label="Account menu">`. Dropdown `role="menu"`, items `role="menuitem"`. Arrow keys cycle; Escape closes and returns focus to trigger; Tab closes and moves focus naturally; click-outside closes (single `mousedown` listener on `document`, removed on unmount).
- **Implementation:** shadcn's `dropdown-menu` is **not** currently installed in `src/components/ui/` (existing primitives: button, card, form, input, label, tooltip, sonner, accordion, calendar, checkbox, textarea, separator). Default approach is a hand-rolled `useState` + click-outside listener — no new dependency. If during implementation the a11y semantics get fiddly, fall back to adding shadcn's `dropdown-menu` via `npx shadcn@latest add dropdown-menu`.

### AuthContext touch

`AccountMenu` needs `signOut`. The dashboard's bespoke header today already wires a Sign Out button, so `signOut` is already accessible (probably via `AuthContext`). If it's local to the dashboard rather than in context, lift it into `AuthContext` so `AccountMenu` can consume it.

## Per-page cleanup

| Page | Remove |
|---|---|
| `src/app/members/dashboard/page.tsx` | Inline header at lines 64-87 (logo + welcome banner + Settings link + Sign Out). Keep the "Welcome, {first name}" text — demote it to a body-level `<h1>` inside the dashboard section. |
| `src/app/members/settings/page.tsx` | `← Back to Dashboard` link at lines 138-143. |
| `src/app/members/personal-butler/page.tsx` | `← Back to Dashboard` link at lines 40-44. |
| `src/app/members/virtual-butler/page.tsx` | `← Back to Dashboard` link at lines 106-110. |
| `src/app/members/login/page.tsx` | No change — picks up Header from `members/layout.tsx`. |
| `src/app/members/signup/page.tsx` | No change. |
| `src/app/membership/page.tsx` | No change — picks up Header from new layout. |
| `src/app/members/checkout/success/page.tsx` | No change. |
| `src/app/booking-confirmation/page.tsx` | No change — keeps its own body-level CTAs (large brass buttons at lines 105-118; these are content, not chrome). |

## Data flow

No new API routes, no new tables, no schema changes. This is pure UI restructure.

- Auth state: `AuthContext` (Supabase session) → `Header` → `AccountMenu` (logged-in branch).
- Sign-out flow: `AccountMenu` → `AuthContext.signOut()` → Supabase → `router.push("/")`.

## Error handling

| Case | Behaviour |
|---|---|
| Auth loading flicker | Header already renders `null` for the auth-conditional block during `loading: true`. AccountMenu follows the same rule. Result: brief moment with just Home / Our Butlers visible. No skeleton needed. |
| `signOut()` failure | Catch, show sonner toast `"Sign out failed. Try again."`, do not redirect. |
| Pathname check race | Hidden by `usePathname()` becoming available only post-hydration. Sub-100ms flash on auth pages — acceptable. Mitigation reserved if QA flags it. |
| Fixed Header overlap | Layout's `pt-20` reserves space; if a page's existing top padding now visibly stacks, drop the *page's* padding. |
| Auth-gated routes for logged-out users | Out of scope — existing route protection unchanged. |

## Accessibility

- AccountMenu fully keyboard-operable (arrows, Escape, Tab, focus return).
- 44px+ touch targets preserved on mobile.
- Header's existing Escape-to-close mobile menu listener (lines 25-38) unchanged.
- Skip-to-content link still absent — noted as follow-up, not in scope.

## Testing strategy

### New unit tests

**`src/components/landing/__tests__/AccountMenu.test.tsx` (new)**
- Renders nothing when no user.
- Renders initials trigger when user present.
- Trigger click opens menu with Dashboard, Settings, Sign Out items.
- Admin item shows only for `isAdmin(email)` users.
- Sign Out calls `signOut()` and redirects to `/`.
- Sign Out failure shows error toast, no redirect.
- Escape closes menu and returns focus to trigger.
- Click outside closes menu.

**`src/components/landing/__tests__/Header.test.tsx` (extend or create)**
- Logged-out user on `/` sees Sign In + Join.
- Logged-out user on `/members/login` does **not** see Sign In + Join.
- Logged-out user on `/members/signup` does **not** see Sign In + Join.
- Logged-out user on `/members/dashboard` *does* see them — confirms the pathname check is scoped only to the two auth pages, not all of `/members/*` (this scenario is moot in practice because dashboard is auth-gated, but the unit test locks in the rule).
- Logged-in user sees `<AccountMenu />`, not the standalone `Dashboard` button.
- Loading state renders neither auth branch.
- Mobile menu mirrors desktop behaviour for auth-conditional items.

**Layout smoke tests (new — one per layout)**
- `src/app/members/__tests__/layout.test.tsx`: renders Header + children + Footer.
- `src/app/membership/__tests__/layout.test.tsx`: same.
- `src/app/booking-confirmation/__tests__/layout.test.tsx`: same.

**Page regression tests (only where chrome is being removed)**
- `dashboard/__tests__/page.test.tsx`: "Welcome, {name}" present; inline logo / Sign Out / Settings link gone.
- `settings/__tests__/page.test.tsx`: `← Back to Dashboard` gone.
- `personal-butler/__tests__/page.test.tsx`: `← Back to Dashboard` gone.
- `virtual-butler/__tests__/page.test.tsx`: `← Back to Dashboard` gone.

### TDD posture

- `AccountMenu` is a clean TDD candidate — write the rendering + interaction tests first, then implement.
- Layout edits and page "remove this element" tests are lower-leverage TDD but still worth doing: write the failing assertion first, delete the element, watch it pass. Locks in the regression contract.

### Manual / visual QA (pre-merge checklist)

- Walk every logged-in route — Header appears, Footer appears, content isn't behind the Header.
- Sign Out from each route — confirm redirect to `/`.
- Mobile width: open hamburger on every route — AccountMenu items render inline.
- `/members/login` and `/members/signup`: Sign In + Join hidden; logo + Home + Our Butlers visible.
- Keyboard nav: Tab to AccountMenu trigger → Enter opens → arrow keys cycle → Escape closes and returns focus to trigger.
- Refresh `/members/dashboard` while logged in — no flash of Sign In / Join CTAs.

## Implementation order (informs the plan)

1. Create/edit the three layouts. Add `pt-20` to `<main>`. Smoke tests should pass.
2. Build `AccountMenu`. Unit tests drive the work.
3. Update Header: add `usePathname()` suppression, swap the Dashboard button for AccountMenu. Header unit tests drive this.
4. Strip bespoke headers from dashboard / settings / personal-butler / virtual-butler. Page regression tests drive this.
5. Manual QA pass.

## Skill usage during implementation

- `/test-driven-development` — applies cleanly to AccountMenu and to the Header behaviour changes.
- `/frontend-design` — invoke when styling AccountMenu (only visual-design task in this spec).
- `/systematic-debugging` — reserve for if regressions appear in manual QA (auth-loading flicker, fixed-Header overlap).
