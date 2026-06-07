# Design: Genie in a Butler redesign (audacious red/white/gold) + mobile-red bug

Status: **design only** (implement in a later session), EXCEPT the mobile-red bug which is an isolated fix that can ship with the content edits if approved.
Source: Farida feedback 6 Jun, "Formatting" section.

## What Farida asked for

> Genie in a Butler: when you click on the link the writing is not clear, especially the writing in red. I think the background colour should be changed to red, and we use red, white and gold. Everything about the Genie in the Butler link should be audacious.
> Also, when scrolling on the phone the "Summon Your Genie" doesn't seem to show up as red on mobile.

Three things:
1. **Legibility:** red text on the dark background is hard to read (the eyebrow "Genie In a Butler", the response-promise line, and example bullets are all `text-destructive` on charcoal).
2. **Audacious red/white/gold treatment:** make the Genie section background red and lean into a red/white/gold palette. Bold, confident.
3. **Bug:** on mobile the sticky "Summon Your Genie" bar is NOT red.

## Confirmed bug (root caused)

`src/components/genie/GenieStickyBar.tsx` applies `bg-charcoal/95` on mobile and only switches to `md:bg-destructive` (red) at the `md` breakpoint. So on phones the bar is charcoal, not red. Fix: apply the red background at all breakpoints (move `bg-destructive` out of the `md:` prefix), keeping contrast/legibility. This is small and isolated — candidate to ship now.

## Current state
- `src/components/landing/GenieSection.tsx` — homepage Genie section. Charcoal bg with a faint red radial glow; red eyebrow/promise/bullets on dark (the legibility complaint).
- `src/components/genie/GenieDrawer.tsx` — drawer variant.
- `src/components/genie/GenieStickyBar.tsx` — sticky CTA (mobile-red bug).

## Proposed direction (to refine in a visual brainstorm)
- Flip the Genie section to a **red background** with **white** primary text and **gold** (brass) accents — inverting today's "red-on-dark" which is the legibility problem.
- Re-map the palette: red surface, white headline/body, gold for the eyebrow/accents and the response-promise line. Ensure WCAG-AA contrast on the new surface.
- Make the CTA button white/gold on red (or gold on red) rather than red-on-red.
- Sticky bar red on all breakpoints.
- "Audacious" — bigger type, more confident motion, but keep the project's `viewport={{ once: true }}` and `rounded-sm` conventions.

This is visual; recommend running it through the visual companion / design-shotgun before implementation.

## Components touched
- `GenieSection.tsx`, `GenieDrawer.tsx`, `GenieStickyBar.tsx`
- Existing red/white/gold tokens: `--destructive` (red), `--optical-white`, `--brass` (gold). Reuse tokens; do not hardcode hex.

## Copy rule
No em dashes. Keep "Genie In a Butler" / "Summon Your Genie" wording.
