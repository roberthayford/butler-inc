# A6 — Footer Link Scaffolding (Design)

**Date:** 2026-05-24
**Author:** Rob Hayford (paired with Claude)
**Brief reference:** `Butlers Inc Implementation Brief May 2026.md` → Section A → A6
**Status:** Approved for implementation

## Why

Faridah's brief asks for the site footer to expose 9 links — About Us,
Terms and Conditions, Privacy Policy, Refund Policy, Cookie Policy, ICO
membership, Careers, Contact Us, FAQs. Two of these (`/privacy`, `/terms`)
exist with placeholder content. The other seven need to exist as routes
so the footer links don't 404, even though the real content is still
being written by Faridah.

## What this is, and what it isn't

This is a scaffolding ticket. The goal is footer parity with Faridah's
list and crash-free routes for the seven missing pages. It is **not**:

- A real contact form
- A real FAQ accordion
- Real privacy / cookie / refund / ICO copy
- A careers listing system
- A newsletter signup or social-icons addition

All of those are explicitly deferred per the brief.

## Footer layout

Current: `grid-cols-1 md:grid-cols-3` — Brand | Our Butlers | Legal (2 links).

New: `grid-cols-1 md:grid-cols-4` — Brand | Our Butlers | Links A-D | Links E-I.

```
Brand          Our Butlers      About Us              Cookie Policy
tagline        Busy Butler      Terms and Conditions  ICO Membership
email          Baby Butler      Privacy Policy        Careers
               Bougie Butler    Refund Policy         Contact Us
               Base Butler                            FAQs
               Budget Butler
               Bespoke Butler
```

Mobile (<768px): stacks to a single column. Brand row first, Butlers
second, then the 9 links flow vertically.

Link order in the two new columns follows Faridah's brief order
verbatim — no semantic regrouping. Existing "Terms of Service" label is
renamed to "Terms and Conditions" to match her wording.

## Routes

| Route | Status | h1 (Title) | Subtitle | Body |
|---|---|---|---|---|
| `/about` | new | About Us | The story is still being told. | Check back shortly. |
| `/terms` | exists | Terms and Conditions | Our legal team is pressing the fine print. | Check back shortly. |
| `/privacy` | exists | Privacy Policy | Our legal team is pressing the fine print. | Check back shortly. |
| `/refund` | new | Refund Policy | Refunds, written precisely. | Check back shortly. |
| `/cookies` | new | Cookie Policy | Tracking the small print. | Check back shortly. |
| `/ico` | new | ICO Membership | Registration in progress. | Check back shortly. |
| `/careers` | new | Careers | We're hiring soon — quietly first. | Check back shortly. |
| `/contact` | new | Contact Us | Our line will be open soon. | Check back shortly. |
| `/faqs` | new | FAQs | Questions, queued. | Check back shortly. |

All 9 live under `src/app/(legal)/` so they inherit the existing
Header + Footer layout from `(legal)/layout.tsx`.

## Shared component

`src/components/PlaceholderPage.tsx`:

```ts
type PlaceholderPageProps = {
  title: string;
  subtitle: string;
  body?: string;
};
```

Renders the same visual layout the existing `/privacy` and `/terms`
pages use (charcoal background, centered serif h1, italic subtitle,
warm-gray body). The existing two pages are refactored to consume it.
Each `page.tsx` becomes a ~5-line shell:

```tsx
export const metadata = { title: "Cookie Policy | Butlers Inc." };
export default function CookiesPage() {
  return (
    <PlaceholderPage
      title="Cookie Policy"
      subtitle="Tracking the small print."
      body="Check back shortly."
    />
  );
}
```

When Faridah ships real content for a page, that page stops using
`PlaceholderPage` and gets its own JSX. The component is throwaway
scaffolding — its only job is to prevent 9 near-identical files from
drifting during the placeholder phase.

## TDD ordering

Per the `/test-driven-development` skill the user invoked:

1. `PlaceholderPage.test.tsx` — renders title, subtitle, optional body. Red → green.
2. `placeholder-pages.test.tsx` — one file, 7 smoke tests asserting each new route renders its expected h1. Red → green.
3. `Footer.test.tsx` — asserts all 9 expected hrefs render with their expected text. Red → green.

Existing test files for `/privacy` and `/terms` (if any) stay green
through the refactor — the user-visible output is identical.

## Verification

- `npm run test:run`: 298 (baseline) + ~12 new = ~310 passing, 0 failing.
- `npm run lint`: 6 errors / 12 warnings unchanged (all pre-existing in `AuthContext.tsx` and elsewhere).
- Browser walk at 1280px and 375px:
  - Footer on `/` shows the expected 4-col / 1-col layout.
  - Each of the 9 links navigates and lands on a styled page matching the existing `/privacy` aesthetic.

## Branch + PR

- Branch: `feat--a6-footer-scaffolding` off `staging`.
- Single PR back to `staging`.
- **Never merged to `main`** — standing rule.

## Out of scope (deferred)

- A7 hero darkness (visual; awaiting Faridah direction call).
- Section C £35→£50 member rate (awaiting Faridah lock on £50).
- Section C tier values / rename / Stripe live integration.
- PR #13 territory (signed-in Genie + booking phone field) — Gabriel is on it.
- Real content for any of the 9 footer pages.
