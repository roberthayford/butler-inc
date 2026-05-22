# Privacy Policy & Terms of Service Pages

## Summary

Create two placeholder legal pages (`/privacy` and `/terms`) with a branded "coming soon" message. The founder will replace the text with final copy later.

## Routes & Layout

- `/privacy` → `src/app/(legal)/privacy/page.tsx`
- `/terms` → `src/app/(legal)/terms/page.tsx`
- Shared layout: `src/app/(legal)/layout.tsx` — wraps with Header + Footer (same pattern as `/butlers`)

## Approach

Static Server Components. No client-side JS, no data files. Pure JSX + Tailwind.

## Page Content

Both pages show:

1. **Page title** (h1) — "Privacy Policy" / "Terms of Service"
2. **Placeholder message:**
   - Headline: "Our legal team is pressing the fine print."
   - Subtitle: "This page will be updated shortly with our full policy."

## Styling

- Dark background, optical-white headings, warm-gray body text
- Centered content, max-width prose container
- Next.js `metadata` export for proper page titles

## Testing

No tests — pure static pages with no logic or interactivity.

## Footer

Already links to `/privacy` and `/terms` — no changes needed.
