# Hero CTA Layout — Design Document

**Date:** 2026-03-21
**Component:** `src/components/landing/AudienceCTA.tsx`
**Status:** Approved

---

## Problem

The unauthenticated hero CTA block has three issues identified via browser review and the UI/UX evaluation framework (`docs/ui-ux-evaluation-framework.md`):

1. **🟠 Major — Competing visual hierarchy (§1.3):** Both cards carry equal weight. The brass "Browse Our Butlers" button and the ghost "Sign In" button are visually subordinated inside identical bordered boxes, muting the primary/secondary distinction that already exists in the button styles.

2. **🟡 Minor — Noisy faint borders (§1.2):** `border border-primary-foreground/10` is too subtle to do useful grouping work but adds visual clutter over the hero background image.

3. **🟡 Minor — Button misalignment (§2.1):** The left card has a two-line description; the right has one line. With `flex-col gap-4` both buttons sit at different vertical positions.

---

## Approach Selected

**Approach A — Remove borders, use a vertical divider + button hierarchy**

Remove per-card box borders entirely. Replace with a single hairline vertical divider (`border-r border-optical-white/15`) on the left card. Use `justify-between` on both flex columns so CSS grid height equalisation pins buttons to the same baseline.

**Why:** Matches the project's "architectural precision" aesthetic (1–2px border radius, minimal ornamentation). Fixes all three issues with minimal code change. Preserves the existing button hierarchy (brass = primary, ghost = secondary).

---

## Exact Changes

### Left card (`motion.div`)

```diff
- className="border border-primary-foreground/10 rounded-sm p-8 flex flex-col gap-4"
+ className="p-8 flex flex-col justify-between border-r border-optical-white/15"
```

Remove description paragraph:
```diff
- <p className="text-warm-gray text-sm leading-relaxed">
-   Premium concierge across England from £35/hr. No contract.
- </p>
```

Remove `self-start` concern — `justify-between` handles button positioning.

### Right card (`motion.div`)

```diff
- className="border border-primary-foreground/10 rounded-sm p-8 flex flex-col gap-4"
+ className="p-8 flex flex-col justify-between"
```

### How alignment works

CSS grid equalises both cell heights to the tallest cell. `justify-between` in each cell pushes the heading group to the top and the button to the bottom. Both buttons land on the same horizontal baseline regardless of how much copy sits above.

---

## Out of Scope

- Authenticated state (`border-l-2 border-l-brass` card) — no changes needed
- Mobile stacked layout — `sm:grid-cols-2` collapses to single column; divider becomes invisible (border-r has no effect in single-column stack, which is correct)
- Animation delays — unchanged
