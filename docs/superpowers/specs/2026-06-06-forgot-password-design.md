# Forgot Password — Design Spec

**Date:** 2026-06-06
**Status:** Approved, ready for implementation plan

## Context

Existing users currently have no way to recover access if they forget their password. The login page offers Sign In and account creation, but no "Forgot password?" path. We need a self-serve password reset flow for users who already have an account.

The app uses Supabase auth with the PKCE flow (`@supabase/ssr`). The building blocks already exist:

- `supabase.auth.resetPasswordForEmail(email, { redirectTo })` sends a recovery email.
- The existing `src/app/auth/callback/route.ts` already exchanges a recovery `code` for a session and redirects to a validated `next` target.
- The settings page already uses `supabase.auth.updateUser({ password })` to change a password — the same primitive the reset flow needs.
- The signup `check-email` flow (`src/app/members/signup/check-email/page.tsx`) is a ready template for a confirmation screen.

This spec assembles those pieces into a complete reset flow that follows existing conventions exactly.

## Goals

- Let an existing user request a reset link from the login page.
- Send a Supabase recovery email and confirm it on a "check your email" screen with resend.
- Let the user set a new password after clicking the link, then land on the dashboard.
- Protect against email enumeration and request flooding.

## Non-Goals

- No changes to the signup or sign-in flows beyond adding one link.
- No new transactional email component — the recovery email is Supabase's dashboard-configured "Reset Password" template, not a Resend/React Email template.
- No "security questions", SMS reset, or multi-factor recovery.
- No forced global sign-out of other sessions.

## Flow

```
Login page ──"Forgot password?"──▶ /members/forgot-password            (enter email)
                                          │ POST /api/members/password-reset  (rate-limited)
                                          ▼
                          /members/forgot-password/check-email          (confirmation + resend)
                                          │  user clicks Supabase recovery email link
                                          ▼
            {origin}/auth/callback?next=/members/reset-password         (existing route: code → session)
                                          ▼
                            /members/reset-password                     (set new password)
                                          │ supabase.auth.updateUser({ password })
                                          ▼
                              /members/dashboard  + "Password updated" toast
```

## Decisions (confirmed)

1. **Three pages**, mirroring the signup flow (request → dedicated check-email → set-new-password).
2. **Request goes through an API route** (`POST /api/members/password-reset`) so it can be per-IP rate-limited and derive `redirectTo` from the request origin server-side. Supabase's own auth rate limiting is a backstop.
3. **After a successful new password**, redirect to `/members/dashboard` (the user is already authenticated via the recovery session) with a success toast. No forced re-login.

## Components

### 1. Forgot-password request page
**Files:** `src/app/members/forgot-password/page.tsx` (server wrapper) + `ForgotPasswordPage.tsx` (client).

- Form: single `email` field, `react-hook-form` + `zod` (`z.string().email()`), shadcn `Form` components.
- Styling reuses `LoginPage.tsx` (charcoal bg, brass button, `max-w-md` centered).
- On submit: `POST /api/members/password-reset` with `{ email }`. On success, `router.push("/members/forgot-password/check-email?email=<email>")`.
- On a 429 response, show a "Too many requests, please try again later." error toast and stay on the page.
- On other failures, show a generic error toast.

### 2. API route
**File:** `src/app/api/members/password-reset/route.ts`. Method: `POST`.

- Per-IP rate limiting via `src/lib/rate-limit.ts` (follow its existing usage on other API routes). On limit exceeded, return `429`.
- Parse + validate body with `zod` (`{ email: string().email() }`). On invalid, return `400`.
- Resolve redirect: `redirectTo = \`${getSiteUrl(request)}/auth/callback?next=/members/reset-password\`` using `getSiteUrl` from `src/lib/site-url.ts`.
- Call `supabase.auth.resetPasswordForEmail(email, { redirectTo })` using the server client (`createClient()` from `src/lib/supabase/server.ts`, anon key).
- **Always return `200 { ok: true }`** regardless of whether the email is registered or whether Supabase returns an error for a missing user — this prevents account enumeration. Log any unexpected Supabase error server-side via `console.error` only; do not surface it to the client.

### 3. Check-email confirmation page
**File:** `src/app/members/forgot-password/check-email/page.tsx`.

- Clone the structure of `src/app/members/signup/check-email/page.tsx`: "Check your email" heading, the email address from `?email=`, spam-folder note, numbered steps.
- Copy adapted to reset context ("We sent a password reset link to ...").
- A "Resend reset email" button with a 30s cooldown that re-POSTs `/api/members/password-reset`. Reuse the cooldown/disabled pattern from `src/components/auth/ResendVerificationButton.tsx` — either generalize that component with props or add a small sibling (decide in the plan; keep one source of cooldown logic).
- Secondary links: "Wrong email? Start over" → `/members/forgot-password`; "Remembered it? Sign in" → `/members/login`.

### 4. Reset (new password) page
**Files:** `src/app/members/reset-password/page.tsx` (server wrapper) + client component.

- Read auth state via `useAuth()` (`user`, `loading`, `supabase`).
- While `loading`: render a spinner/placeholder.
- If not `loading` and no `user` (the recovery code was never exchanged, or the link expired): render an "This reset link is invalid or has expired." state with a link to `/members/forgot-password` to request a new one.
- If `user` present: render a form with `newPassword` + `confirmPassword`, `zod` validation (min 6, and the two must match — reuse the validation shape from the settings password section). On submit: `supabase.auth.updateUser({ password: newPassword })`; on success `toast.success("Password updated")` then `router.push("/members/dashboard")`; on error `toast.error(...)` and stay.

### 5. Login page edit
**File:** `src/app/members/login/LoginPage.tsx`.

- Add a "Forgot password?" link directly under the password field (above or beside the Sign In button), pointing to `/members/forgot-password`, styled like the existing secondary links (`text-brass-text hover:text-brass-muted`).

### 6. Header suppression edit
**File:** `src/components/landing/Header.tsx`.

- Add the three new paths to `AUTH_PAGE_PATHS`: `/members/forgot-password`, `/members/forgot-password/check-email`, `/members/reset-password`. This suppresses the Sign In / Create Account header CTAs on these auth screens, consistent with login/signup.

## No changes needed

- `src/app/auth/callback/route.ts` — already exchanges the recovery `code` and redirects to a validated `next`. `next=/members/reset-password` passes its `startsWith("/")` validation.
- `src/context/AuthContext.tsx` — the request is an API route; the new-password step uses the already-exposed `supabase` client.
- No new environment variables.

## Error handling summary

| Situation | Behavior |
| --- | --- |
| Unknown / unregistered email | API returns `200`; user sees the generic "check your email" confirmation (no enumeration). |
| Invalid email format | API returns `400`; client shows a validation error. |
| Too many requests | API returns `429`; client shows "Too many requests, please try again later." |
| Expired / invalid recovery link | No session established → reset-password page shows the invalid-link state with a link to request a new one. |
| `updateUser` failure | Error toast; user stays on the reset-password page. |

All customer-facing copy avoids em dashes (project hard constraint).

## Ops / configuration (no code)

In the Supabase dashboard:
- Ensure the "Reset Password" auth email template is enabled.
- Ensure `…/auth/callback` is in the Redirect URL allowlist for every origin (`https://butlersinc.com`, `https://staging.butlersinc.com`, `http://localhost:3000`). This is already documented in `CLAUDE.md` under the auth-callback pattern.

## Testing (TDD: red → green → refactor)

Mirror existing patterns: `src/app/members/__tests__/signup.test.tsx`, `src/app/auth/callback/__tests__/route.test.ts`, `src/app/api/members/signup/__tests__/route.test.ts`. Use `@/test/test-utils` and `vi.mock` for Supabase + navigation.

**API route — `password-reset/__tests__/route.test.ts`:**
- Returns `200` and calls `resetPasswordForEmail` with `redirectTo` derived from the request origin (e.g. `https://staging.butlersinc.com/auth/callback?next=/members/reset-password`).
- Returns `200` even when Supabase reports the email is unknown (no enumeration).
- Returns `400` on invalid email.
- Returns `429` when the rate limiter trips.

**Forgot-password page:**
- Submitting a valid email POSTs and navigates to `/members/forgot-password/check-email?email=...`.
- Invalid email shows a validation message and does not POST.
- A failed request shows an error toast.

**Reset-password page:**
- No session → renders the invalid-link state with a link to forgot-password.
- With session → renders the form; submitting valid matching passwords calls `updateUser({ password })`, then navigates to `/members/dashboard` with a success toast.
- Password mismatch and min-length each block submission with a validation message.

**Check-email page:**
- Renders the email from the query param.
- Resend button is disabled during the cooldown after a click.

**Login page:**
- A "Forgot password?" link is present and points to `/members/forgot-password`.

## Verification

1. `npm run test:run` — all new and existing suites pass.
2. `npm run lint` — clean for new/edited files.
3. `npm run dev` and walk the flow: login → "Forgot password?" → submit email → check-email screen → (in dev, use the Supabase recovery link / local inbox) → callback → reset-password → set password → dashboard with toast.
4. Confirm enumeration protection: submitting an unregistered email yields the same confirmation screen.
5. Confirm no em dashes in any new customer-facing copy.
