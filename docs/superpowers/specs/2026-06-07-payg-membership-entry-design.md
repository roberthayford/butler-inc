# Design: Pay-As-You-Go vs Membership two-path entry

Status: **design only** (implement in a later session). Branch: staging.
Source: Farida feedback 6 Jun, "Formatting" section.

## Problem

The original homepage entry intent was a clean two-option fork: "click for Pay-As-You-Go" OR "click for Membership". That intent has been diluted. The current component (`src/components/landing/AudienceCTA.tsx`) presents:
- "New to Butlers Inc.?" → buttons "Browse Our Butlers" + "Become a member"
- "Already a member?" → "Sign In"

Farida wants the fork restated explicitly around the two **ways to use the service** (PAYG vs Members), not around new-vs-returning.

## What Farida asked for (verbatim intent)

1. Remove the "New to Butlers Inc." statement.
2. Remove the "Already a member" statement.
3. Box (a): **Pay-As-You-Go**. Box (b): **Members**.
4. Clicking **Members** → sign-in page (as now) → membership pricing section → a "Back to home" button below.
5. Clicking **Pay-As-You-Go** → all the Butler boxes → how to book → info that membership is cheaper → membership packages at the bottom.

## Proposed approach

Two cards, equal weight:

- **Pay-As-You-Go** → routes to a PAYG view. Simplest: route to `/butlers` (butler grid + how-to-book already exist) and append, at the bottom of that page, a "membership is cheaper" prompt + the membership packages (reuse the membership tier cards). This avoids a new route.
- **Members** → routes to `/members/login` (sign-in as now). After sign-in, surface the membership pricing section and a "Back to home" button. For signed-in members this still resolves to the dashboard (preserve current "Welcome back" behaviour).

Open design choices (resolve in implementation brainstorm):
- Does "Pay-As-You-Go" go to `/butlers` (reuse) or a dedicated PAYG landing? Reuse is YAGNI-aligned.
- "Membership is cheaper" messaging: a comparison strip vs a single line + CTA.
- Where the membership packages render on the PAYG path (bottom of `/butlers`).
- Auth states: signed-out (two cards), signed-in (the existing welcome-back path likely stays).

## Components touched
- `AudienceCTA.tsx` (relabel, restructure)
- `/butlers` page (append membership-is-cheaper + tier cards on the PAYG path)
- Possibly the membership tier card component (`src/components/membership/TierCard.tsx`) for reuse
- "Back to home" button after the members pricing view

## Out of scope
- Pricing logic, checkout flow (unchanged).

## Copy rule
No em dashes. "Pay-As-You-Go" (hyphenated brand label) and "Members" exactly as Farida wrote.
