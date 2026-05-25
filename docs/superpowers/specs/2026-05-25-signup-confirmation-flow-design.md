# Signup Confirmation Flow — Design

**Date:** 2026-05-25
**Branch (target):** `staging`
**Status:** Draft, awaiting user review
**Related:** Sibling of `2026-05-25-logged-in-navigation-coverage-design.md` (merged via PR #25); sub-project #1 from the original three-way decomposition.

## Problem

After successful signup, `SignupPage` (`src/app/members/signup/SignupPage.tsx:54-55`) fires a sonner toast `"Account created! Please check your email to verify."` then immediately `router.push("/members/login")`. The toast is frequently missed during the redirect transition, leaving the user on the login page wondering what just happened and never realising they need to check their inbox (or junk folder).

## Goals

- Replace the easily-missed toast with a dedicated, persistent surface that clearly communicates: account created, verification email sent, where to look, what happens after they click.
- Give users an obvious recourse if the email doesn't arrive (resend button with sensible throttling).
- Preserve the existing `?next=` query-param flow so users who arrived at signup with a specific destination still land there after verifying.

## Non-goals

- No live polling for verification status across tabs.
- No magic-link login on this page (only resend of the signup verification).
- No email-change affordance on this page (the "Wrong email? Start over" link sends them back to signup).
- No analytics events beyond what currently exists.

## Decisions

Settled during brainstorming:

1. **Surface:** dedicated page at `/members/signup/check-email`, not an inline state on the signup page.
2. **Resend:** button with 30-second client-side cooldown timer (Supabase's ~60s server-side throttle is the source of truth; the client timer is UX clarity).
3. **Implementation strategy:** server component page + small client island (`ResendVerificationButton`) for the interactive piece.
4. **Email passing:** via query string (`?email=<encoded>`), not sessionstorage. Survives refresh, simpler, low-sensitivity disclosure (user's own email in their own browser).
5. **`next` propagation:** the new page forwards `?next=` from signup through `emailRedirectTo` so the Supabase magic link's callback URL preserves the original destination.
6. **Header CTA suppression:** extend the existing `Header.tsx` suppression list to include `/members/signup/check-email` so the page chrome doesn't show redundant Sign In / Join CTAs (the page has its own "Already verified? Sign in" affordance).
7. **No verification detection:** the page is passive. Users who already verified click the explicit "Already verified? Sign in" link.

## Architecture

### New files

- `src/app/members/signup/check-email/page.tsx` — **async** server component (Next 16 / App Router treats `searchParams` as a Promise), awaits and reads `email` and `next` from `searchParams`, renders static content. Signature: `export default async function Page({ searchParams }: { searchParams: Promise<{ email?: string | string[]; next?: string | string[] }> }) { const sp = await searchParams; ... }`.
- `src/components/auth/ResendVerificationButton.tsx` — client component containing cooldown state and the `supabase.auth.resend(...)` call.
- `src/components/auth/__tests__/ResendVerificationButton.test.tsx` — unit tests (TDD).
- `src/app/members/signup/check-email/__tests__/page.test.tsx` — unit tests for the new page.

### Modified files

- `src/app/members/signup/SignupPage.tsx` — lines 54-55: replace the `toast.success(...)` + `router.push("/members/login")` pair with `router.push(\`/members/signup/check-email?email=<encoded>&next=<original-if-any>\`)`. Drop the success toast. The `toast` import stays (still used in the error path on line 50).
- `src/components/landing/Header.tsx` — extract literal pathname check into a module-level `AUTH_PAGE_PATHS` constant set; add `/members/signup/check-email` to the set.
- `src/components/landing/__tests__/Header.test.tsx` — add one suppression test for the new path.

### Routing flow

1. User submits signup → `/api/members/signup` succeeds.
2. Client navigates to `/members/signup/check-email?email=<encoded>[&next=<original>]`.
3. Page renders confirmation content + resend button.
4. User checks inbox → clicks Supabase magic link → lands on `/auth/callback?code=...&next=<preserved>` → `exchangeCodeForSession` → redirect to `next` (default `/members/dashboard`).

Header sits on the page via `members/layout.tsx` (already in place from PR #25). With the suppression extension, the Header shows logo + Home + Our Butlers only — no Sign In / Join.

### Page structure (`check-email/page.tsx`)

```
[Header via members/layout]
  ↓
Centred container (max-w-md, mirrors signup page)
  ↓
  <h1>Check your email</h1>
  ↓
  Paragraph: "We sent a verification link to {email}. Click the link to activate your account."
  ↓
  Subtle callout panel: "Can't find it? Check your junk or spam folder."
  ↓
  "What happens next" mini-list (3 short lines):
    1. Click the link in the email
    2. We'll sign you in automatically
    3. You'll land on your dashboard
  ↓
  <ResendVerificationButton email={email} next={next} />
  ↓
  Footer row: "Wrong email? Start over" → /members/signup AND "Already verified? Sign in" → /members/login
[Footer via members/layout]
```

### Component contract — `ResendVerificationButton`

**Props:**
- `email: string | null` — required for resend; if null, button is hidden entirely
- `next?: string | null` — optional `?next=` value forwarded to Supabase's `emailRedirectTo`

**State:** single timestamp `cooldownEndsAt: number | null`; derived `cooldownRemaining: number` via `setInterval`.

**Behaviour:**
- Default label: `Resend verification email`
- Click: call `supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: \`\${window.location.origin}/auth/callback\${next ? \`?next=\${encodeURIComponent(next)}\` : ""}\` } })`
- Success: `toast.success("Verification email sent")`, set `cooldownEndsAt = Date.now() + 30_000`
- Supabase error (e.g. rate-limit): `toast.error(<supabase message verbatim>)`; no cooldown started (so user can retry as soon as Supabase's throttle releases)
- Network failure: `toast.error("Couldn't resend right now. Please try again.")`; no cooldown
- Cooldown UI: button disabled, label `Resend in {n}s`, ticks via 1s `setInterval` cleared in `useEffect` cleanup

**`supabase` client:** import `createClient` from `@/lib/supabase/client` (same pattern as `AuthContext`).

### Header CTA suppression refactor

In `src/components/landing/Header.tsx`, replace:

```ts
const suppressAuthCTAs = pathname === "/members/login" || pathname === "/members/signup";
```

with a module-level constant:

```ts
const AUTH_PAGE_PATHS: ReadonlySet<string> = new Set([
  "/members/login",
  "/members/signup",
  "/members/signup/check-email",
]);
```

and inside the component:

```ts
const suppressAuthCTAs = AUTH_PAGE_PATHS.has(pathname);
```

This closes the M-3 minor flagged in the previous PR's final cross-task review.

## Data flow

No new API routes, no new tables, no schema changes. Uses `supabase.auth.resend` directly from the browser via the shared client. The auth callback at `src/app/auth/callback/route.ts` is unchanged.

## Copy (final — no em dashes)

| Element | Text |
|---|---|
| H1 | `Check your email` |
| Body (with email) | `We sent a verification link to {email}. Click the link to activate your account.` |
| Body (generic, no email param) | `We sent a verification link to the email you signed up with. Click the link to activate your account.` |
| Junk callout | `Can't find it? Check your junk or spam folder.` |
| Next-steps list | `Click the link in the email` / `We'll sign you in automatically` / `You'll land on your dashboard` |
| Button (idle) | `Resend verification email` |
| Button (cooldown) | `Resend in {n}s` |
| Toast (success) | `Verification email sent` |
| Toast (generic error) | `Couldn't resend right now. Please try again.` |
| Wrong-email link | `Wrong email? Start over` → `/members/signup` |
| Sign-in link | `Already verified? Sign in` → `/members/login` |

## Error handling

| Case | Behaviour |
|---|---|
| Supabase returns success on resend | Toast `"Verification email sent"`, start 30s cooldown |
| Supabase returns rate-limit error | Toast Supabase's message verbatim; no cooldown |
| Supabase returns generic error | Toast `"Couldn't resend right now. Please try again."`; no cooldown |
| Network failure / fetch throws | Same generic toast; no cooldown |
| `email` query param missing | Render generic body copy; ResendButton not rendered. No crash, no 404. |
| `email` query param is an array | Take first element |
| `email` is empty string | Treat as null |
| Already-verified user clicks Resend | Supabase returns its own benign error (e.g. `"User already confirmed"`); toast surfaces it. User uses the "Already verified? Sign in" link. |
| User navigates back to `/members/signup` after landing on check-email | Signup page behaviour unchanged. Re-submitting same email yields Supabase's "user already exists" error in the existing error path. |
| Multi-tab verification | Verifying tab lands on `/auth/callback` → dashboard. Original check-email tab stays static. No polling. |

## Visual treatment

Drives the `/frontend-design` work during implementation. Conventions to follow:
- Charcoal background (`hsl(220 20% 18%)`), brass accents
- Serif h1 (Cormorant Garamond)
- `rounded-sm` (architectural radius)
- Single brass-bordered card container at `max-w-md` (mirrors signup page width)
- Generous breathing room (~`py-12`/`py-16`)
- No em dashes anywhere

## Testing strategy (TDD)

### New unit tests

**`src/components/auth/__tests__/ResendVerificationButton.test.tsx`**

| Test | Assertion |
|---|---|
| Renders nothing when email is null | Container empty |
| Renders default label when idle | Button visible with text "Resend verification email" |
| Click triggers `supabase.auth.resend` with correct args | Mock called once with `{ type: "signup", email, options: { emailRedirectTo: … } }` |
| Success: toast + cooldown starts | `toast.success("Verification email sent")`; button disabled; label "Resend in 30s" |
| Success: cooldown ticks down | Fake timers advance, label updates |
| Success: cooldown ends, button re-enabled | After 30s, label returns to default, button enabled |
| Supabase error: toast error, no cooldown | `toast.error` called; button still enabled |
| Network failure: generic toast, no cooldown | Same shape |
| `next` prop is appended to `emailRedirectTo` | Resend call args include `?next=…` in redirect URL |

Use `vi.useFakeTimers()` for countdown. Mock `createClient` from `@/lib/supabase/client`, `toast.success` / `toast.error` from `sonner`.

**`src/app/members/signup/check-email/__tests__/page.test.tsx`**

| Test | Assertion |
|---|---|
| Renders H1 "Check your email" | Heading level 1 present |
| Renders email when provided in `searchParams` | Body contains the email |
| Renders generic copy when no email | Body matches generic variant; ResendButton absent |
| Renders ResendButton when email provided | Button present |
| Renders "Wrong email? Start over" link → `/members/signup` | Link with correct href |
| Renders "Already verified? Sign in" link → `/members/login` | Link with correct href |

Server component testing: the default export is async; tests `await` it with `searchParams` as `Promise.resolve({ email: "ada@example.com" })`, then render the returned JSX through testing-library. Pattern:

```tsx
const ui = await Page({ searchParams: Promise.resolve({ email: "ada@example.com" }) });
render(ui);
```

### Modified unit tests

**`src/app/members/signup/__tests__/signup.test.tsx`** (extend; create if not present)
- After successful submit, navigation target is `/members/signup/check-email?email=<encoded>` (plus `next` when present)
- `toast.success` is NOT called on success
- Error-path tests continue to pass

**`src/components/landing/__tests__/Header.test.tsx`** (extend)
- Add: logged-out user on `/members/signup/check-email` does NOT see Sign In or Join

### Manual / visual QA

- Sign up with a fresh email → land on check-email page → email arrives → click link → land on dashboard
- Repeat with `?next=/membership` on signup → final landing is `/membership`
- Click Resend → toast, button disabled with countdown
- Click Resend twice rapidly → second click rejected by client cooldown
- Wait 30s → button re-enables
- Visit `/members/signup/check-email` directly (no query params) → renders generic copy, no resend button, no crash
- Header on `/members/signup/check-email` (logged-out) → no Sign In / Join CTAs

## Implementation order (informs the plan)

1. Extend `AUTH_PAGE_PATHS` in Header + add the Header suppression test. Smallest, isolated.
2. Build `ResendVerificationButton` with TDD. Component in isolation.
3. Build the `check-email/page.tsx` server component with its tests.
4. Modify `SignupPage.tsx` to navigate to the new page (with `email` and `next` propagated). Update / add signup tests.
5. Manual QA.

## Skill usage during implementation

- `/test-driven-development` — applies to every step except the SignupPage edit (which gets a regression test for the new navigation target).
- `/frontend-design` — invoke when styling `check-email/page.tsx` (visible static page with brass accents on charcoal). ResendButton uses the existing Button primitive so no design work needed there.
