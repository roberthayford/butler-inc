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
