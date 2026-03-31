# Persistent Genie CTA — Design Document

**Date:** 2026-03-31
**Status:** Approved

## Summary

Replace the in-page `GenieSection` on the homepage with a persistent, site-wide sticky CTA bar that opens a bottom-sheet drawer containing the wish submission flow. The Genie experience becomes accessible from every page without leaving the current context.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| CTA format (mobile) | Slim full-width bottom bar | Screen real estate demands it |
| CTA format (desktop) | Bottom-right floating card (~380px) | Premium feel, less intrusive than full-width |
| Form surface | Bottom sheet / drawer overlay | User doesn't lose page context; lower friction |
| Tone | "Have an impossible wish?" + "Summon Your Genie" button | Warm invitation + branded action |
| Scope | Every page, site-wide | Site-wide conversion tool, not homepage-specific |
| Visibility | Appears after 200px scroll | Avoids competing with hero on homepage |
| In-page GenieSection | Removed from homepage | Not requested by stakeholder (Faridah) |

## Architecture

### Components

1. **`GenieStickyBar`** (`src/components/genie/GenieStickyBar.tsx`)
   - Persistent CTA rendered in `layout.tsx` (available on all pages)
   - Manages open/closed state of the drawer
   - Handles scroll-threshold visibility (show after 200px)
   - Mobile: full-width bottom bar, ~56px
   - Desktop: floating card, bottom-right, ~380px wide

2. **`GenieDrawer`** (`src/components/genie/GenieDrawer.tsx`)
   - Bottom sheet overlay containing the wish flow
   - 3-phase form: wish → contact → success
   - Reuses existing API submission logic (`POST /api/bookings`)
   - Mobile: slides up from bottom, ~85vh
   - Desktop: panel from bottom-right, ~480px wide, max ~70vh
   - Close: X button, click outside, Escape key
   - Body scroll locked while open
   - Auto-closes 3s after success

### Layout Integration

```
layout.tsx
  <Providers>
    {children}
    <GenieStickyBar />
  </Providers>
```

### Removals

- Delete `GenieSection` import and usage from `src/app/page.tsx`
- Delete `src/components/landing/GenieSection.tsx`
- Delete `src/components/landing/__tests__/GenieSection.test.tsx`

## Mobile Design (< md breakpoint)

- Fixed bottom bar, full viewport width
- Charcoal background (`bg-charcoal/95`), top border (`border-primary-foreground/10`), backdrop blur
- Left: "Have an impossible wish?" in warm-gray text
- Right: "Summon Your Genie" button with red (`destructive`) background
- Height: ~56px with `px-4 py-3`
- Entry animation: slide up from below (translateY), 300ms, premium ease

## Desktop Design (md+ breakpoint)

- Floating card pinned to bottom-right with margin (~24px from edges)
- ~380px wide, charcoal background, subtle border, slight shadow
- "Have an impossible wish?" as small serif heading
- "Summon Your Genie" button below
- Red accent glow (subtle, matching original GenieSection atmosphere)

## Drawer Design (both breakpoints)

### Phase 1: Wish
- Textarea: "Describe your impossible wish..."
- Example wishes listed below (reused from original)
- "Continue" button (red)

### Phase 2: Contact
- Shows the wish in a quote block
- Name, email, phone fields
- "Submit Your Wish" button (red)
- "Back" link

### Phase 3: Success
- Checkmark icon
- "Wish received" heading
- "We'll be in touch within the hour"
- Auto-closes after 3 seconds

### Drawer Mechanics
- Backdrop: charcoal overlay at 50% opacity, click to close
- Close button (X) top-right
- Escape key closes
- Body scroll locked (`overflow: hidden` on body)
- Framer Motion AnimatePresence for enter/exit
- Premium ease curve: `[0.22, 1, 0.36, 1]`

## Motion

- Sticky bar: `opacity: 0, y: 20` → `opacity: 1, y: 0` (300ms, premium ease)
- Drawer: slides up from bottom with backdrop fade
- Phase transitions within drawer: AnimatePresence mode="wait"
- No `viewport={{ once: true }}` — these are interaction-triggered, not scroll-triggered
