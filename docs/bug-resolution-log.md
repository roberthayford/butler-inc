# Bug Resolution Log

Tracks significant bugs, their root causes, and lessons learned to inform future development.

## Format

Each entry follows this structure:

### [Date] — Short description
- **Symptom:** What was observed
- **Root cause:** Why it happened
- **Fix:** What was changed (commit ref if useful)
- **Lesson:** What to watch for in future work

---

## Entries

### 2026-03-31 — Invisible content on client-side navigation
- **Symptom:** Sections disappeared when navigating between butler pages via client-side routing
- **Root cause:** `whileInView` Framer Motion animations don't re-trigger on client-side navigation because the elements are already in the viewport when the component mounts
- **Fix:** Replaced `whileInView` with `animate` for entrance animations on butler pages (commit `337a9fc`)
- **Lesson:** Avoid `whileInView` for content that must be visible on client-side nav. Use `animate` with `viewport={{ once: true }}` or check mount state.

### 2026-03-31 — Non-admin users could access /admin page
- **Symptom:** Any authenticated user could view the admin panel
- **Root cause:** No server-side or client-side admin check on the `/admin` route
- **Fix:** Added admin email check to restrict access (commits `c18d809`, `c99f1ce`)
- **Lesson:** Always gate admin routes with `isAdmin()` from `src/lib/admin.ts` — both the page component and any Header nav links.

### 2026-05-23 — Signed-in booking forms asked for account identity again
- **Symptom:** Signed-in users opening booking forms were still asked for their name and email.
- **Root cause:** Booking form validation and API payloads treated name/email as client-entered fields for every user, even though authenticated users already have those details in Supabase auth metadata.
- **Fix:** Hide name/email fields for authenticated booking forms and have booking APIs override submitted contact identity from `auth.getUser()`.
- **Lesson:** For authenticated flows, derive account identity server-side and only ask for intake details that are booking-specific.

### 2026-05-24 — Confirm-email button in signup emails sent users to `http://localhost:3000/?code=…`
- **Symptom:** The "Confirm your email" button in Supabase signup emails landed users on `http://localhost:3000/?code=…` instead of the deployed site, and the `?code=…` was silently dropped without signing the user in.
- **Root cause:** Three layered defects — (a) Supabase project's **Site URL** was still the default `http://localhost:3000`; (b) neither `signUp()` call site (`src/context/AuthContext.tsx`, `src/app/api/members/signup/route.ts`) passed `options.emailRedirectTo`, so the app could not pick the right origin per environment (prod/staging/preview/local); (c) no `/auth/callback` route existed to call `exchangeCodeForSession(code)` and persist the session.
- **Fix:** Added `src/lib/site-url.ts` (`getSiteUrl(request?)`) that prefers the request origin then `NEXT_PUBLIC_SITE_URL`; both signup paths now pass `emailRedirectTo: ${origin}/auth/callback`; new `src/app/auth/callback/route.ts` exchanges the code and redirects to `?next=` (default `/members/dashboard`) with an open-redirect guard. Supabase dashboard updated (Site URL → `https://staging.butlersinc.com`; Redirect URL allowlist gained `…/auth/callback` for prod, staging, and localhost) and `NEXT_PUBLIC_SITE_URL` set per Vercel environment.
- **Lesson:** For any Supabase magic-link / confirm-email / reset-password flow, always pass `emailRedirectTo` explicitly *and* keep a matching callback route. The dashboard's **Site URL** is a single global fallback, it cannot serve multiple environments at once.

### 2026-05-24 — "The string did not match the expected pattern" toast on booking submit
- **Symptom:** Customer tried to make a payment on a butler page and saw a Sonner toast with the cryptic message "The string did not match the expected pattern". The error was opaque to the user, gave no actionable info, and persisted across reloads.
- **Root cause (probable):** Vercel had `SUPABASE_SERVICE_ROLE_KEY` flagged as "Needs Attention" (empty or invalid value). `/api/create-checkout-session` calls `createServiceClient()` at line 103 outside the route's try/catch. With a missing key, supabase-js throws "supabaseKey is required" synchronously. Next.js then returns a default 500 page with an HTML body, not JSON. The client did `await res.json()`, which calls `JSON.parse(htmlString)`. **Safari/WebKit's JSON.parse error message is exactly "The string did not match the expected pattern"** (Chrome and Firefox produce different wording). The outer `catch (err)` then did `toast.error(err.message)`, surfacing Safari's internal message verbatim to the customer.
- **Fix (root cause):** Re-set `SUPABASE_SERVICE_ROLE_KEY` in Vercel (Project → Settings → Environment Variables) with the live value from Supabase API settings. The "Needs Attention" badge clears once the value is valid.
- **Fix (defense in depth):** Wrapped the top-level `POST` handler in `/api/create-checkout-session/route.ts` and `/api/bookings/route.ts` in a try/catch that always returns JSON 500 with the underlying error message, and added a `readErrorMessage()` helper in `src/components/booking/BookingFlow.tsx` that falls back to `Booking failed (HTTP <status>)` when the response body cannot be parsed as JSON. Future misconfigurations now surface useful messages client-side instead of Safari's `JSON.parse` error.
- **Lesson:** Any Next.js route handler can throw before its first `NextResponse.json(...)` — `createClient()`, `createServiceClient()`, `await request.json()`, factory functions, all are unhandled-throw candidates. Wrap the entire handler body in a try/catch so the response is **always** a JSON envelope. On the client, never call `res.json()` without falling back to `res.text()` or a status message when the response body isn't JSON. Also: Safari's `JSON.parse` error message is its own signature, useful for triaging "response was HTML, not JSON" symptoms.
