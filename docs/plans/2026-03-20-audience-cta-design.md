# Audience CTA Section — Design

**Date:** 2026-03-20

## Goal

Add a dual-audience CTA section to the homepage that routes visitors to the right path based on whether they are a new visitor or a returning member.

## Placement

Between `<Hero />` and `<HowItWorks />` in `src/app/page.tsx`.

## Behaviour by Auth State

| State | What renders |
|---|---|
| Loading | `null` — no render, avoids layout shift |
| Unauthenticated | Two side-by-side cards |
| Authenticated | Single personalised welcome card |

## Unauthenticated — Two Cards

Two cards in a `grid grid-cols-1 sm:grid-cols-2` layout.

**Left card — New visitors:**
- Heading: "New to Butlers Inc.?"
- Body: "Premium concierge across England from £35/hr. No contract."
- CTA: "Browse Our Butlers" → `/butlers` (brass primary button)

**Right card — Returning members:**
- Heading: "Already a member?"
- Body: "Pick up where you left off."
- CTA: "Sign In" → `/members/login` (ghost/outline button)

Both cards: `bg-charcoal`, `border border-primary-foreground/10`, `rounded-sm`, Cormorant Garamond serif headings.

## Authenticated — Single Welcome Card

Full-width horizontal card (text left, button right on desktop; stacked on mobile).

- Heading: "Welcome back, [first name]." (derived from `user.user_metadata.name`, fallback to email prefix)
- Body: "Your butler is ready when you are."
- CTA: "Go to Dashboard" → `/members/dashboard` (brass primary button)
- Left accent: `border-l-2 border-brass` for visual distinction

## Architecture

- **File:** `src/components/landing/AudienceCTA.tsx`
- **Type:** Client component (`"use client"`)
- **Auth:** `useAuth()` from `@/context/AuthContext` — same hook used by Header
- **No new dependencies**

## Testing

Three test cases in `src/components/landing/__tests__/AudienceCTA.test.tsx`:

1. **Loading state** → component renders nothing
2. **Unauthenticated** → both card headings present, correct `href` values on CTAs
3. **Authenticated** → single card with user's first name, "Go to Dashboard" link to `/members/dashboard`
