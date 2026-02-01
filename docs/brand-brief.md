# Butlers Inc. Brand Brief

> Comprehensive brand analysis extracted from the live codebase.
> **Generated:** February 2026

---

## Executive Summary

**Butlers Inc.** is a premium personal concierge platform that delivers on-demand butler services across England. The brand conveys **understated luxury**, **discretion**, and **trusted reliability** through a sophisticated visual language anchored by a warm, matte **Antique Brass** accent colour. The design philosophy blends the elegance of British heritage with modern, mobile-first functionality.

---

## Visual Identity

### Primary Colour Palette

| Token | HSL Value | Hex Equivalent | Usage |
|-------|-----------|----------------|-------|
| **Brass** (Primary Accent) | `30 45% 48%` | `#B3895D` | CTAs, highlights, trust indicators, price accents |
| **Brass Muted** | `30 30% 62%` | `#B09E89` | Subtle UI elements, step numbers, secondary accents |
| **Charcoal** | `220 20% 18%` | `#262F3D` | Primary text, dark section backgrounds, header text |
| **Cream** | `40 33% 98%` | `#FCFBF9` | Page background, light sections |
| **Ivory** | `42 30% 95%` | `#F7F5F0` | Card backgrounds, modal surfaces |
| **Optical White** | `0 0% 99%` | `#FDFDFD` | Hero text on dark overlays, high-contrast UI |

### Semantic Colours

| Token | HSL Value | Hex Equivalent | Purpose |
|-------|-----------|----------------|---------|
| **Sage** | `145 25% 45%` | `#5B9473` | Trust indicators, success states, body-cam badges |
| **Sage Light** | `145 30% 92%` | `#E4F2E9` | Success backgrounds, trust icon circles |
| **Warm Gray** | `30 8% 60%` | `#9E9893` | Secondary text, muted content |
| **Destructive Red** | `0 72% 51%` | `#DF3131` | "Genie" emergency button, destructive actions |

### Colour Usage Hierarchy

1. **Brass** — Reserved for premium touchpoints: CTAs, price displays, section labels ("Our Services"), service subtitles, and hover states
2. **Charcoal** — Primary text colour and dark section backgrounds (Butler Categories, Membership, Footer)
3. **Cream/Ivory** — Background surfaces alternating to create visual rhythm between sections
4. **Sage** — Trust and safety messaging, body-cam enabled badges
5. **Red** — Emergency "Genie" service only; used sparingly for maximum impact

### Overall Mood & Personality

- **Sophisticated & Understated**: No bright colours or playful tones; muted palette projects mature confidence
- **Warm Luxury**: The brass and cream combination evokes antique brass fixtures, leather-bound books, and traditional British service
- **Trustworthy & Discreet**: Sage green for safety messaging, restrained colour palette, minimal decorative elements
- **Modern Refinement**: Clean interfaces despite luxury positioning; no ornate details or excessive embellishment

---

## Typography

### Font Families

| Use Case | Font Family | Fallbacks | Source |
|----------|-------------|-----------|--------|
| **Headings (H1–H6)** | Cormorant Garamond | Georgia, serif | Google Fonts |
| **Body Text** | Inter | system-ui, sans-serif | Google Fonts |

### Type Scale

Based on Tailwind defaults with custom heading application:

| Element | Class/Size | Font Weight | Usage |
|---------|------------|-------------|-------|
| **Display/Hero H1** | `text-5xl sm:text-5xl md:text-6xl lg:text-7xl` | medium (500) | Hero headline |
| **Section H2** | `text-3xl md:text-4xl` or `lg:text-5xl` | medium (500) | Section titles |
| **Card/Component H3** | `text-xl md:text-2xl` or `text-2xl md:text-3xl` | medium (500) | Card titles, service names |
| **Body Large** | `text-lg md:text-xl` | regular (400) | Hero subtext, emphasized paragraphs |
| **Body Default** | `text-base` (~16px) | regular (400) | Standard content |
| **Body Small** | `text-sm` (14px) | regular/medium | FAQ answers, list items, meta text |
| **Caption/Labels** | `text-xs` (12px) | medium (500) | Tags, uppercase labels, badges |

### Font Weights in Use

**Cormorant Garamond (Headings):**
- 400 (Regular) — Italic for emphasis ("Life, *handled.*")
- 500 (Medium) — Standard headings
- 600 (Semi-bold) — Available but rarely used
- 700 (Bold) — Available for emphasis

**Inter (Body):**
- 300 (Light) — Not commonly used
- 400 (Regular) — Standard body text
- 500 (Medium) — Buttons, navigation, labels
- 600 (Semi-bold) — Emphasis within body text

### Typography Patterns

- **Uppercase tracking**: Section labels use `uppercase tracking-widest text-xs` for sophistication
- **Letter-spacing**: Headings use `tracking-wide` for elegance
- **Line height**: Body text uses `leading-relaxed` (1.625) for readability
- **Text shadow**: Hero text uses `text-shadow-crisp` for legibility over images
- **Text balance**: Headings apply `text-balance` for optimal line wrapping

---

## Tone & Voice Indicators

### Visual Tone Assessment

| Dimension | Rating | Justification |
|-----------|--------|---------------|
| Professional vs Casual | **85% Professional** | Formal typography, muted colours, British service positioning |
| Minimal vs Ornate | **75% Minimal** | Clean interfaces, sparse decoration, focused content |
| Traditional vs Modern | **60% Traditional** | Classic serif headings balanced with modern sans-serif UI |
| Warm vs Cool | **70% Warm** | Brass, cream, and ivory create warmth; charcoal prevents starkness |
| Exclusive vs Accessible | **65% Exclusive** | Luxury positioning but with transparent pricing and PAYG options |

### Target Audience Impressions

Based on design choices, the target audience appears to be:

1. **High-Net-Worth Individuals**: Luxury colour palette, premium pricing, bespoke service tier
2. **Time-Poor Professionals**: Emphasis on urgency ("same-day"), efficiency, "Life, handled" messaging
3. **Parents & Families**: Baby Butler with body-cam transparency, school run focus, welfare checks
4. **Property Owners**: Base Butler positioning for key holding, tradesman coordination
5. **UK-Centric**: "Across England" coverage, British butler heritage, GBP pricing

### Brand Personality Traits

| Trait | Expression in UI |
|-------|------------------|
| **Discretion** | "Discreet assistance", muted visuals, no flashy elements |
| **Reliability** | Trust & Safety section, DBS checks, vetting process |
| **Sophistication** | Antique brass, serif headings, "Bougie Butler" tier |
| **Efficiency** | "Done in under sixty seconds", real-time tracking, smart pricing |
| **Warmth** | Personal messaging ("Your butler awaits"), testimonials, body-cam transparency |
| **Exclusivity** | Membership tiers, "Genie" emergency service, priority access |

### Micro-copy Tone

- **Conversational yet refined**: "Regular access or occasional use. Either works."
- **Action-oriented**: "Begin Now", "Reserve this Butler"
- **Benefit-focused**: "Your personal butler, on demand"
- **Understated confidence**: "Every butler. Vetted. Discreet. Available."

---

## Design Principles

### Observed UI Patterns

1. **Section Rhythm**: Alternating background colours (cream → charcoal → ivory → charcoal) create clear visual separation without hard borders

2. **Card Elevation Pattern**:
   - Light sections: `bg-background border border-border` with subtle `shadow-sm`
   - Dark sections: `bg-primary-foreground/5 border border-primary-foreground/10 backdrop-blur`
   - Hover states elevate with `-translate-y-1 shadow-2xl`

3. **Glass-morphism on Dark**: Butler category cards and membership cards use `backdrop-blur` with translucent backgrounds

4. **Consistent Spacing**: Section padding follows `py-24 md:py-32 lg:py-40` pattern with safe-area-inset support

5. **Grid Patterns**:
   - 2-column for membership comparison
   - 3-column for features, testimonials, trust indicators
   - 6-item butler grid as 1×6 (mobile) → 2×3 (tablet) → 3×2 (desktop)

### Interaction Patterns

1. **Active Press Feedback**: All buttons use `active:scale-[0.98]` for tactile response
2. **Smooth Transitions**: 300ms standard duration, `ease-out` timing function
3. **Hover → Brass**: Links and interactive elements transition to brass colour on hover
4. **Scroll-Based UI**: Header transparency changes, sticky booking bar appears on scroll
5. **Modal/Drawer Pattern**: Desktop shows modal, mobile shows bottom drawer for service details

### Animation System

| Animation | Duration | Easing | Usage |
|-----------|----------|--------|-------|
| **fade-up** | 600ms | ease-out | Hero content entrance, staggered delays |
| **fade-in** | 500ms | ease-out | Tab content transitions |
| **accordion-down/up** | 200ms | ease-out | FAQ accordions |
| **Custom timing** | 350ms | — | Butler category grid transitions |
| **Scale feedback** | instant | — | Button active states |

### Responsive Behaviour

- **Mobile-first breakpoints**: `md:` (768px) and `lg:` (1024px)
- **Safe-area-inset support**: Header, footer, sections all respect device notches
- **Bottom sheet pattern**: ServiceModal uses Drawer on mobile, Dialog on desktop
- **Sticky booking bar**: Appears on mobile after scrolling 70% of viewport

### Accessibility Considerations

#### ✅ Present
- **Focus ring styling**: `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`
- **Screen reader labels**: Dialog close buttons have `sr-only` text
- **Semantic HTML**: Proper heading hierarchy, section landmarks
- **Reduced motion**: `prefers-reduced-motion` not explicitly implemented but minimal animations
- **Form accessibility**: React Hook Form with proper labelling infrastructure

#### ⚠️ Potential Gaps
- No explicit `aria-labels` on icon-only buttons (Genie emoji)
- Colour contrast should be verified on brass-on-ivory combinations
- No visible skip-to-content link
- Dark mode exists in tokens but appears unused in production

---

## Key Brand Differentiators

1. **"The Genie"**: Emergency service tier with dramatic red styling — the only non-brass accent
2. **Body-cam Transparency**: Unique selling point for Baby Butler and Base Butler services
3. **AI-Optimised Pricing**: Route efficiency and demand-based pricing communicated as a feature
4. **Membership + PAYG Duality**: Flexible access model with clear value proposition for each
5. **British Heritage Positioning**: "Traditional British butler" language, England-wide coverage

---

## Brand Asset Inventory

| Asset | Location | Format | Size |
|-------|----------|--------|------|
| Primary Logo (dark bg) | `/public/images/butler-inc-trans-logo.webp` | WebP | 20KB |
| Primary Logo (light bg) | `/public/images/butlers-inc-logo.webp` | WebP | 15KB |
| Favicon | `/public/favicon.png` | PNG | 310KB |
| Hero Background | `/public/images/hero-butler.png` | PNG | 737KB |
| Butler Service Images (6) | `/public/images/[service]-butler.png` | PNG | 535KB–911KB each |

---

*This brand brief is derived from code analysis and should be validated against business documentation and stakeholder intent.*
