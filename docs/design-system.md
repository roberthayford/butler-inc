# Butlers Inc. Design System

> A comprehensive guide for building consistent, premium UI experiences.
> **Version 1.0** • Generated February 2026

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Colour System](#colour-system)
3. [Typography System](#typography-system)
4. [Component Patterns](#component-patterns)
5. [Layout & Spacing](#layout--spacing)
6. [Animation System](#animation-system)
7. [Accessibility Requirements](#accessibility-requirements)
8. [Do's and Don'ts](#dos-and-donts)

---

## Design Philosophy

Butlers Inc. implements a **"Hybrid Enterprise"** design approach, blending:

- **Apple HIG elegance** — Clean typography, refined spacing, premium feel
- **Google MD3 functionality** — Systematic components, consistent behaviour
- **British heritage warmth** — Antique brass accents, traditional serif headings

### Core Principles

| Principle | Implementation |
|-----------|----------------|
| **Understated Luxury** | Muted palette, serif/sans pairing, no decorative icons |
| **Architectural Geometry** | 2px base radius, clamped max 4px; square corners convey precision |
| **Trust & Transparency** | Sage green for safety, body-cam messaging, DBS badges |
| **Mobile-First** | Bottom drawers, safe-area insets, touch-optimised buttons |
| **Accessible Premium** | WCAG compliance with luxury aesthetic |

### Geometric Principles

The design system enforces architectural geometry — near-square corners that convey precision and intentionality.

| Rule | Detail |
|------|--------|
| **Base radius** | 2px (`rounded-sm` in Tailwind) |
| **Maximum radius** | 4px — never exceed this for any component |
| **Prohibited classes** | `rounded-full`, `rounded-xl`, `rounded-2xl`, `rounded-lg` |
| **Permitted classes** | `rounded-sm` (2px), `rounded` (4px for special cases only) |

All cards, buttons, inputs, badges, and modals use `rounded-sm`. There are no pill-shaped controls, no circular avatars, and no soft-radius containers anywhere in the interface.

### Icon Strategy

Marketing-facing content is **icon-free**. Typography, colour, and layout carry the interface without decorative iconography.

| Context | Approach |
|---------|----------|
| **Landing page / marketing** | No decorative icons. Numerals, em-dashes, and typography convey structure |
| **shadcn/ui primitives** | Lucide icons retained for functional UI only: accordion chevrons, checkbox marks, calendar navigation, toast close buttons |
| **Components.json** | `"iconLibrary": "lucide"` remains correct — it serves shadcn/ui internals, not marketing content |

---

## Colour System

### Primary Palette

#### Antique Brass (Brand Accent)
```css
--brass: 30 45% 48%;     /* Primary accent */
--brass-muted: 30 30% 62%; /* Secondary accent */
```

| Token | CSS Variable | Tailwind Class | Hex | Usage |
|-------|--------------|----------------|-----|-------|
| Brass | `--brass` | `text-brass`, `bg-brass`, `border-brass` | `#B3895D` | CTAs, highlights, price displays |
| Brass Muted | `--brass-muted` | `text-brass-muted` | `#B09E89` | Step numbers, subtle accents |

#### Foundation Colours
```css
--charcoal: 220 20% 18%;     /* Primary text, dark sections */
--cream: 40 33% 98%;         /* Light backgrounds */
--ivory: 42 30% 95%;         /* Cards, modals */
--optical-white: 0 0% 99%;   /* Hero text, high contrast */
```

### Semantic Colours

| Purpose | Token | Tailwind | Hex | Example |
|---------|-------|----------|-----|---------|
| Success/Trust | `sage` | `text-sage`, `bg-sage-light` | `#5B9473` | Body-cam badges, trust indicators |
| Error/Emergency | `destructive` | `bg-destructive` | `#DF3131` | Genie button only |
| Secondary Text | `muted-foreground` | `text-muted-foreground` | `#6B7280` | Descriptions, placeholders |
| Borders | `border` | `border-border` | `#E3DFD8` | Card borders, dividers |

### Colour Combinations & Contrast

#### ✅ Approved Combinations

| Background | Text | Use Case | Contrast Ratio |
|------------|------|----------|----------------|
| Cream (`#FCFBF9`) | Charcoal (`#262F3D`) | Standard content | 13.5:1 ✓ |
| Charcoal (`#262F3D`) | Optical White (`#FDFDFD`) | Dark sections | 14.2:1 ✓ |
| Charcoal (`#262F3D`) | Brass (`#B3895D`) | Accent on dark | 4.8:1 ✓ |
| Ivory (`#F7F5F0`) | Brass (`#B3895D`) | Accent on light | 3.2:1 ⚠️ |

#### ⚠️ Caution: Brass on Light Backgrounds

Brass accent on ivory or cream backgrounds has lower contrast (3.2:1). Use these combinations for:
- **Large text only** (18pt+ regular or 14pt+ bold)
- **Decorative elements** (not essential content)
- **Always pair with additional context** (e.g., larger type, supporting body text)

### Colour Application Rules

```tsx
// ✅ CORRECT: Use semantic tokens
<button className="bg-primary text-primary-foreground">Book Now</button>
<p className="text-muted-foreground">Secondary text</p>

// ❌ INCORRECT: Don't hardcode colours
<button style={{ backgroundColor: '#262F3D' }}>Book Now</button>
```

---

## Typography System

### Font Families

#### Headings: Cormorant Garamond

*Classic serif font conveying British heritage and premium positioning.*

```tsx
// Applied automatically via Tailwind
<h1 className="font-serif text-5xl font-medium">Life, handled.</h1>
```

**Weights Available:**
- 400 (Regular) — Italic for *emphasis*
- 500 (Medium) — Standard headings ⬅️ **Default**
- 600 (Semi-bold) — Available
- 700 (Bold) — Strong emphasis

#### Body: Inter

*Modern sans-serif for functional UI and readable content.*

```tsx
<p className="font-sans text-base">Standard body text</p>
```

**Weights Available:**
- 300 (Light) — Available
- 400 (Regular) — Body text ⬅️ **Default**
- 500 (Medium) — Buttons, labels
- 600 (Semi-bold) — Emphasis

### Type Scale

| Element | Classes | Size (Desktop) | Example |
|---------|---------|----------------|---------|
| **Hero H1** | `text-5xl md:text-6xl lg:text-7xl font-serif font-medium` | 72px | "Life, *handled.*" |
| **Section H2** | `text-3xl md:text-4xl font-serif font-medium` | 36px | "How Butlers Inc. works" |
| **Card H3** | `text-xl md:text-2xl font-serif font-medium` | 24px | "Busy Butler" |
| **Component H4** | `text-lg font-serif font-medium` | 18px | FAQ questions |
| **Body Large** | `text-lg md:text-xl` | 20px | Hero subtext |
| **Body Default** | `text-base` (implicit) | 16px | Paragraphs |
| **Body Small** | `text-sm` | 14px | List items, meta |
| **Caption** | `text-xs font-medium uppercase tracking-widest` | 12px | "OUR SERVICES" |

### Typography Patterns

#### Section Eyebrows
```tsx
<p className="text-brass font-medium uppercase tracking-widest text-sm mb-3">
  Our Services
</p>
```

#### Hero Text with Shadow
```tsx
<h1 className="font-serif text-5xl font-medium text-optical-white text-shadow-crisp">
  Life, <span className="italic">handled.</span>
</h1>
```

#### Balanced Text Wrapping
```tsx
<h2 className="font-serif text-3xl font-medium text-balance">
  Long heading that wraps nicely
</h2>
```

### Line Length Guidelines

| Content Type | Max Width | Tailwind Class |
|--------------|-----------|----------------|
| Body paragraphs | 65-75 characters | `max-w-xl` to `max-w-2xl` |
| Hero subtext | 50-60 characters | `max-w-2xl` |
| Card descriptions | 45-55 characters | `max-w-sm` |

---

## Component Patterns

### Buttons

#### Variants

```tsx
// Primary (Default)
<Button>Reserve this Butler</Button>
// → bg-primary text-primary-foreground (charcoal with cream text)

// Secondary
<Button variant="secondary">Explore Membership</Button>
// → bg-secondary text-secondary-foreground

// Outline
<Button variant="outline">Close</Button>
// → border border-input bg-background

// Ghost
<Button variant="ghost">Cancel</Button>
// → transparent, hover:bg-accent

// Destructive (Genie only)
<Button className="bg-red-600 hover:bg-red-700 text-white">
  Summon the Genie
</Button>
```

#### Sizes

| Size | Classes | Height | Use Case |
|------|---------|--------|----------|
| `sm` | `size="sm"` | 36-40px | Secondary actions, inline |
| `default` | (implicit) | 40-48px | Standard buttons |
| `lg` | `size="lg"` | 44-56px | Primary CTAs |
| `icon` | `size="icon"` | 40-48px | Icon-only buttons |

#### Interaction States

```tsx
// All buttons include:
className="transition-all duration-200 active:scale-[0.98]"

// Focus states are built-in:
className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
```

#### Hero CTA Variants (Dark Background)

```tsx
// Solid on dark
<Button className="hero-cta-solid">Book Now</Button>

// Outline on dark
<Button className="hero-cta-outline">Learn More</Button>
```

### Cards

#### Standard Card (Light Background)

```tsx
<div className="p-6 rounded-sm bg-background border border-border shadow-sm">
  <h3 className="font-serif text-xl font-medium mb-3">Card Title</h3>
  <p className="text-muted-foreground">Card content goes here.</p>
</div>
```

#### Glass-morphism Card (Dark Background)

```tsx
// Used in Butler Categories and Membership sections
<div className="p-8 rounded-sm bg-primary-foreground/5 border border-primary-foreground/10 backdrop-blur transition-all duration-300 hover:bg-primary-foreground/10 hover:border-primary-foreground/20 hover:-translate-y-1 hover:shadow-2xl">
  <h3 className="font-serif text-xl font-medium text-primary-foreground">
    Card Title
  </h3>
</div>
```

#### Testimonial Card

```tsx
<div className="relative">
  <div className="absolute -top-4 left-6 text-6xl text-brass/30 font-serif">
    "
  </div>
  <div className="p-6 pt-8 rounded-sm bg-background border border-border">
    <p className="text-foreground leading-relaxed mb-6">{quote}</p>
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">{context}</p>
      <span className="text-xs font-medium text-brass bg-brass/10 px-2 py-1 rounded-sm">
        {service}
      </span>
    </div>
  </div>
</div>
```

### Form Elements

#### Input

```tsx
<Input
  type="email"
  placeholder="Enter your email"
  className="h-10 rounded-sm border border-input bg-background px-3 py-2"
/>
```

#### Quiz Option Button

```tsx
<button className="w-full p-4 text-left rounded-sm border border-border hover:border-brass/50 hover:bg-accent/50 transition-all">
  <span className="font-medium">Option Label</span>
  <span className="block text-sm text-muted-foreground">
    Supporting description
  </span>
</button>
```

### Navigation

#### Header (Transparent → Solid on Scroll)

```tsx
<header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
  isScrolled 
    ? "bg-background/95 backdrop-blur-sm shadow-sm" 
    : "bg-transparent"
}`}>
```

#### Underline Tabs (Hero)

```tsx
<div className="inline-flex gap-8">
  <button
    onClick={() => handleTabClick("non-members")}
    className={`
      px-1 pb-2 text-sm font-medium tracking-wide transition-all duration-300 border-b-2
      ${activeTab === "non-members"
        ? "border-optical-white text-optical-white"
        : "border-transparent text-optical-white/50 hover:text-optical-white"
      }
    `}
  >
    Non-Members
  </button>
  <button
    onClick={() => handleTabClick("members")}
    className={`
      px-1 pb-2 text-sm font-medium tracking-wide transition-all duration-300 border-b-2
      ${activeTab === "members"
        ? "border-optical-white text-optical-white"
        : "border-transparent text-optical-white/50 hover:text-optical-white"
      }
    `}
  >
    Members
  </button>
</div>
```

Active state is communicated through a `border-b-2` underline, not a filled pill background. Inactive tabs use `border-transparent` and reduced opacity text.

### "How It Works" Pattern

Sequential steps use **typographic numerals** in the brand serif, not icon-in-circle patterns.

```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
  {steps.map((step, i) => (
    <div key={i} className="text-center">
      <span className="block text-4xl font-serif font-semibold text-brass-text/40 mb-4">
        {String(i + 1).padStart(2, "0")}
      </span>
      <h3 className="text-lg font-serif font-semibold text-optical-white mb-2">
        {step.title}
      </h3>
      <p className="text-warm-gray text-sm leading-relaxed max-w-xs mx-auto">
        {step.description}
      </p>
    </div>
  ))}
</div>
```

The zero-padded numerals (`01`, `02`, `03`) at `text-4xl` in brass at 40% opacity serve as the visual anchor — no icons, no circles, no background shapes.

### Trust Indicators

Trust indicators use an **em-dash-separated text-only** pattern. No icons, no badges, no background shapes.

```tsx
<div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-2 text-warm-gray text-sm tracking-wide">
  {indicators.map((indicator, i) => (
    <span key={i} className="flex items-center gap-2">
      {i > 0 && (
        <span className="text-warm-gray/30" aria-hidden="true">
          &mdash;
        </span>
      )}
      <span>{indicator.text}</span>
    </span>
  ))}
</div>
```

This produces output like: `DBS-checked — Insured — Live body-cam — 24/7 support`. The em-dashes (`&mdash;`) are decorative (`aria-hidden="true"`), and the entire line reads as a single flowing statement.

### Modals & Drawers

#### Desktop Modal

```tsx
<DialogContent className="sm:max-w-[520px] p-6 rounded-sm bg-ivory border-0 shadow-2xl">
  <DialogHeader>
    <DialogTitle className="font-serif text-2xl font-medium">
      Title
    </DialogTitle>
    <DialogDescription className="text-brass font-medium">
      Subtitle
    </DialogDescription>
  </DialogHeader>
  {/* Content */}
</DialogContent>
```

#### Mobile Drawer

```tsx
<DrawerContent className="px-4 pb-8 bg-ivory max-h-[90vh] border-0">
  <DrawerHeader className="text-left pt-4 px-0">
    {/* Header content */}
  </DrawerHeader>
  {/* Body content */}
  <DrawerFooter className="px-0 pt-4 gap-3">
    <Button className="w-full h-12">Primary Action</Button>
  </DrawerFooter>
</DrawerContent>
```

### Accordions (FAQ)

```tsx
<Accordion type="single" collapsible className="w-full">
  <AccordionItem value="item-1" className="border-b border-border">
    <AccordionTrigger className="text-left font-serif text-lg font-medium py-6 hover:no-underline hover:text-brass transition-all duration-300">
      Question text?
    </AccordionTrigger>
    <AccordionContent className="text-muted-foreground pb-6 leading-relaxed">
      Answer text.
    </AccordionContent>
  </AccordionItem>
</Accordion>
```

### Tags & Badges

#### Service Type Tag

```tsx
<span className="text-xs font-medium uppercase tracking-wider px-2 py-1 rounded-sm bg-secondary text-muted-foreground">
  In-Person
</span>
```

#### Body-cam Badge

```tsx
<span className="text-xs font-medium uppercase tracking-wider px-2 py-1 rounded-sm bg-sage-light text-sage">
  Body-cam enabled
</span>
```

#### Testimonial Service Label

```tsx
<span className="text-xs font-medium text-brass bg-brass/10 px-2 py-1 rounded-sm">
  Busy Butler
</span>
```

---

## Layout & Spacing

### Container System

```tsx
// Main container
<div className="max-w-7xl mx-auto px-4 md:px-8">

// Narrow content container
<div className="max-w-5xl mx-auto">

// Very narrow (FAQ, forms)
<div className="max-w-3xl mx-auto">
```

### Section Padding

```css
.section-padding {
  @apply py-24 md:py-32 lg:py-40;
  padding-left: calc(1.5rem + env(safe-area-inset-left));
  padding-right: calc(1.5rem + env(safe-area-inset-right));
}

@media (min-width: 768px) {
  .section-padding {
    padding-left: calc(2.5rem + env(safe-area-inset-left));
    padding-right: calc(2.5rem + env(safe-area-inset-right));
  }
}

@media (min-width: 1024px) {
  .section-padding {
    padding-left: calc(4rem + env(safe-area-inset-left));
    padding-right: calc(4rem + env(safe-area-inset-right));
  }
}
```

### Grid Patterns

#### 2-Column (Membership Comparison)
```tsx
<div className="grid md:grid-cols-2 gap-6 md:gap-8">
```

#### 3-Column (Features, Testimonials)
```tsx
<div className="grid md:grid-cols-3 gap-8 md:gap-12">
```

#### 6-Item Responsive Grid (Butler Categories)
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
```

### Section Backgrounds (Alternating Pattern)

| Section | Background | Text |
|---------|------------|------|
| Hero | Dark overlay on image | `text-optical-white` |
| Butler Categories | `bg-charcoal` | `text-primary-foreground` |
| How It Works | `bg-ivory` | `text-foreground` |
| Service Details | `bg-secondary` | `text-foreground` |
| Membership | `bg-charcoal` | `text-primary-foreground` |
| Trust & Safety | Default (cream) | `text-foreground` |
| Testimonials | `bg-ivory` | `text-foreground` |
| FAQ | Default (cream) | `text-foreground` |
| Footer | `bg-charcoal` | `text-primary-foreground` |

### Responsive Breakpoints

| Breakpoint | Tailwind | Width | Usage |
|------------|----------|-------|-------|
| Mobile (default) | — | < 640px | Single column, full-width elements |
| SM | `sm:` | ≥ 640px | Slight adjustments |
| MD | `md:` | ≥ 768px | 2-column layouts, desktop nav |
| LG | `lg:` | ≥ 1024px | 3-column layouts, larger text |
| XL | `xl:` | ≥ 1280px | Maximum container |
| 2XL | `2xl:` | ≥ 1400px | Ultra-wide container |

---

## Animation System

### Entrance Animations

```tsx
// Fade up (hero content)
<div className="animate-fade-up">Content</div>

// Fade in (tab content)
<div className="animate-fade-in">Content</div>

// Staggered delays
<div className="animate-fade-up" style={{ animationDelay: "0.1s" }}>
```

### Interaction Feedback

```tsx
// Button press feedback
className="active:scale-[0.98]"

// Card hover elevation
className="transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"

// Link colour transition
className="transition-colors hover:text-brass"

// Image zoom on hover
className="transition-transform duration-700 hover:scale-105"
```

### Accordion Animation

```css
animate-accordion-down: accordion-down 0.2s ease-out;
animate-accordion-up: accordion-up 0.2s ease-out;
```

### Timing Guidelines

| Context | Duration | Easing |
|---------|----------|--------|
| Micro-interactions (buttons, links) | 200ms | ease-out |
| Component transitions | 300ms | ease-out |
| Entrance animations | 500-600ms | ease-out |
| Image/content transforms | 700ms | ease-out |
| Page-level transitions | 500ms | cubic-bezier |

---

## Accessibility Requirements

### Focus States

All interactive elements include visible focus indicators:

```tsx
className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
```

### Screen Reader Support

```tsx
// Hidden close button label
<DialogPrimitive.Close>
  <X className="h-4 w-4" />
  <span className="sr-only">Close</span>
</DialogPrimitive.Close>
```

### Keyboard Navigation

- All buttons are keyboard accessible
- Tab navigation follows logical order
- Accordions support Enter/Space to toggle
- Modals trap focus when open

### Required Improvements

1. **Add aria-labels to icon-only buttons**
2. **Add skip-to-content link**
3. **Verify brass-on-ivory contrast for AA compliance**
4. **Test with screen readers**
5. **Add `prefers-reduced-motion` media query support**

---

## Do's and Don'ts

### ✅ Do's

1. **Use design tokens, not hex values**
   ```tsx
   // Good
   className="bg-brass text-cream"
   // Bad
   style={{ backgroundColor: '#B3895D' }}
   ```

2. **Apply section-padding for consistent sections**
   ```tsx
   <section className="section-padding bg-ivory">
   ```

3. **Use font-serif for headings, font-sans for body**
   ```tsx
   <h2 className="font-serif text-3xl">Heading</h2>
   <p className="font-sans text-base">Body</p>
   ```

4. **Include active:scale feedback on buttons**
   ```tsx
   className="active:scale-[0.98]"
   ```

5. **Use glass-morphism on dark backgrounds**
   ```tsx
   className="bg-primary-foreground/5 backdrop-blur"
   ```

### ❌ Don'ts

1. **Don't use bright or saturated colours**
   - No pure red, blue, or green outside of semantic purposes

2. **Don't skip heading hierarchy**
   - H1 → H2 → H3, never skip levels

3. **Don't use box-shadow on dark backgrounds**
   - Use `hover:-translate-y-1` elevation instead

4. **Don't hardcode magic numbers for spacing**
   - Use Tailwind's spacing scale

5. **Don't omit safe-area-inset support on fixed elements**
   ```tsx
   // Include for mobile devices with notches
   padding-bottom: calc(1rem + env(safe-area-inset-bottom));
   ```

---

## Quick Reference

### Import shadcn/ui Components

```bash
npx shadcn@latest add button
npx shadcn@latest add dialog
npx shadcn@latest add accordion
```

### Common Patterns File Locations

| Pattern | File |
|---------|------|
| Button variants | `src/components/ui/button.tsx` |
| Design tokens | `src/app/globals.css` (`@theme` block) |
| Tailwind config | Tailwind 4 — configured via `@theme` in `src/app/globals.css` |
| Service data | `src/data/services.ts` |
| Butler page configs | `src/data/butler-page-configs.ts` |

---

*This design system is a living document. Update as patterns evolve.*
