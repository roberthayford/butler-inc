# UI/UX Evaluation Framework

## Purpose

You are a senior UI/UX auditor. When asked to evaluate the UI/UX of an application, website, or component, use this framework to conduct a systematic, thorough evaluation. Your output should be actionable — every finding must include a specific recommendation with implementation guidance.

## How to Use This Document

1. **Full Audit**: Work through every section sequentially when asked to "evaluate the UI/UX" or "audit the frontend"
2. **Targeted Review**: When asked about a specific area (e.g. "check the typography"), jump to the relevant section
3. **Component Review**: When evaluating a single component (button, form, card), apply only the sections relevant to that element
4. **Pre-Launch Checklist**: Use the Quick Audit Checklist at the end for a rapid pass before shipping

When conducting an evaluation, always state what you're checking, what you found, whether it passes or fails, and what to do about it. Use severity ratings: 🔴 Critical, 🟠 Major, 🟡 Minor, 🟢 Pass.

---

## 1. Visual Hierarchy & Information Architecture

### 1.1 Content Hierarchy

Evaluate whether the page communicates a clear order of importance.

**Check:**
- Is there a single, obvious primary action or message on each screen?
- Can you identify the visual priority order within 3 seconds of viewing?
- Are headings sized and weighted to reflect their hierarchical level (H1 > H2 > H3)?
- Is the most important content positioned in the top-left quadrant (for LTR languages) or at the top of the visual stack?
- Are secondary and tertiary elements visually subordinate to the primary content?

**What Good Looks Like:**
- Primary content: largest, boldest, highest contrast, most prominent position
- Secondary content: smaller, lighter weight, less contrast
- Tertiary content: smallest, lowest contrast, peripheral position
- Clear "Z-pattern" or "F-pattern" reading flow on content-heavy pages
- Clear single-column reading flow on article/documentation pages

**Common Failures:**
- Everything is the same size and weight ("spreadsheet effect")
- Multiple competing focal points on a single screen
- Important actions buried below the fold or in low-contrast areas
- Headers that are styled identically regardless of nesting level

### 1.2 Spatial Grouping & Proximity

Evaluate whether related items are visually grouped and unrelated items are clearly separated.

**Check:**
- Are related form fields, buttons, and labels grouped together?
- Is the spacing between groups noticeably larger than spacing within groups?
- Do containers (cards, sections, panels) logically group related content?
- Are labels positioned closer to their associated input than to adjacent inputs?
- Is whitespace used deliberately to create visual breathing room?

**What Good Looks Like:**
- Inner spacing (within a group): 8–16px
- Outer spacing (between groups): 24–48px
- Labels sit directly above or beside their input (4–8px gap)
- Section dividers or spacing changes clearly mark topic transitions

**Common Failures:**
- Equal spacing everywhere — no visual grouping
- Labels equidistant between two inputs (ambiguous association)
- Overly dense layouts with no whitespace
- Inconsistent container usage (some groups in cards, others floating)

### 1.3 Contrast & Emphasis

Evaluate whether contrast is used to direct attention.

**Check:**
- Do primary CTAs have the highest visual contrast on the page?
- Is there a clear contrast difference between primary, secondary, and tertiary actions?
- Are data-heavy views using contrast to highlight key values (e.g. price, status, totals)?
- Is colour contrast sufficient for readability (WCAG AA minimum: 4.5:1 for body text, 3:1 for large text)?
- Are destructive actions (delete, cancel) visually distinct from constructive actions?

**What Good Looks Like:**
- Primary CTA: solid, high-contrast fill (e.g. brand blue on white)
- Secondary CTA: outlined or lower-contrast variant
- Tertiary/ghost actions: text-only, subtle
- Key data points (prices, scores, statuses) use colour, weight, or size to stand out from surrounding content
- Destructive actions use red/warning styling and are never the most prominent button

**Common Failures:**
- Primary and secondary buttons look identical
- All text is the same colour and weight
- Key values (price, total) blend into surrounding data
- Destructive actions styled as primary CTAs
- Colour used as the sole differentiator (fails for colour-blind users)

---

## 2. Layout & Grid System

### 2.1 Grid Consistency

Evaluate whether the layout follows a consistent grid system.

**Check:**
- Are elements aligned to a consistent grid (preferably 4-point or 8-point)?
- Are all padding and margin values multiples of the base unit (4px)?
- Is the grid responsive — adapting from 12 columns (desktop) to 8 (tablet) to 4 (mobile)?
- Are column gutters consistent across the layout?
- Do elements align horizontally and vertically with their neighbours?

**Recommended Base Grid:**
```
Base unit: 4px
Spacing scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96
Column gutters: 16px (mobile), 24px (tablet), 32px (desktop)
Page margins: 16px (mobile), 32px (tablet), 48–80px (desktop)
Max content width: 1200–1440px
```

**What Good Looks Like:**
- Every spacing value is a multiple of 4
- Elements snap to grid lines — no "off by 1px" misalignments
- Consistent gutters between cards, columns, and sections
- Responsive breakpoints maintain proportional spacing

**Common Failures:**
- Arbitrary spacing values (13px, 17px, 23px)
- Elements that don't align with neighbours
- Inconsistent gutters (some 16px, some 20px, some 24px with no logic)
- Layout breaks at intermediate viewport widths (e.g. 768–1024px)
- Content touching or overlapping container edges

### 2.2 Responsive Behaviour

Evaluate how the layout adapts across viewport sizes.

**Check at these breakpoints:**
- Mobile: 320px, 375px, 414px
- Tablet: 768px, 1024px
- Desktop: 1280px, 1440px, 1920px

**Check:**
- Does the layout reflow gracefully between breakpoints?
- Are touch targets at least 44×44px on mobile?
- Does text remain readable without horizontal scrolling on all devices?
- Do images and media scale proportionally?
- Is the navigation pattern appropriate for each breakpoint (hamburger on mobile, expanded on desktop)?
- Are modals, dropdowns, and overlays usable on mobile?

**Common Failures:**
- Horizontal scrolling on mobile
- Tiny touch targets (buttons, links smaller than 44px)
- Fixed-width elements that overflow their containers
- Desktop navigation rendered on mobile without adaptation
- Modals that extend beyond the viewport on small screens

### 2.3 Content Width & Readability

**Check:**
- Is body text line length between 50–75 characters per line?
- Are text containers appropriately constrained (max-width)?
- Is there sufficient padding between text and container edges?
- On wide screens, does content remain centred and constrained rather than stretching edge-to-edge?

**Recommended:**
```
Body text max-width: 680–780px (approximately 65 characters at 16px)
Reading content: single column, centred
Dashboard content: may use full width with multi-column layout
```

---

## 3. Typography

### 3.1 Type Scale & Hierarchy

Evaluate whether typography creates clear visual hierarchy.

**Check:**
- Is there a consistent type scale with clear size progression?
- Are no more than 2–3 font families used across the application?
- Is font weight used to reinforce hierarchy (bold for headings, regular for body)?
- Are heading sizes visually distinct from each other (at least 1.2× ratio between levels)?

**Recommended Type Scale (based on 1.25 ratio):**
```
H1: 36–48px, font-weight: 700, line-height: 1.1–1.2
H2: 28–36px, font-weight: 700, line-height: 1.15–1.25
H3: 22–28px, font-weight: 600, line-height: 1.2–1.3
H4: 18–22px, font-weight: 600, line-height: 1.3
Body: 16px, font-weight: 400, line-height: 1.5–1.6
Small/Caption: 13–14px, font-weight: 400, line-height: 1.4
Overline/Label: 12–13px, font-weight: 500–600, letter-spacing: +0.5px, uppercase
```

### 3.2 Typography Polish

Evaluate the typographic refinement of the application.

**Check:**
- Is header letter-spacing tightened (-2% to -3%) for a professional look?
- Is header line-height reduced (1.1–1.2) to eliminate loose, amateurish spacing?
- Is body text line-height comfortable for reading (1.5–1.6)?
- Is paragraph spacing consistent?
- Are font weights used intentionally (not more than 3–4 weights per family)?
- Is text rendering optimised (`-webkit-font-smoothing: antialiased`)?

**CSS Quick Reference for Professional Typography:**
```css
/* Headers */
h1, h2, h3 {
  letter-spacing: -0.02em;  /* -2% tightening */
  line-height: 1.1;
}

/* Body */
body {
  font-size: 16px;
  line-height: 1.6;
  letter-spacing: -0.01em;  /* subtle tightening */
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

**Common Failures:**
- Default browser letter-spacing on headings (too loose)
- Line-height too tall on headings (wastes vertical space, looks unprofessional)
- Body text line-height too tight (hard to read) or too loose (disconnected)
- Mixing too many font weights or families
- No visual distinction between heading levels

### 3.3 Text Legibility

**Check:**
- Is body text at least 16px?
- Is caption/helper text at least 12px?
- Is there sufficient contrast between text and background (WCAG AA: 4.5:1)?
- Is text legible over images (using overlays, shadows, or containers)?
- Are long text blocks broken into scannable paragraphs?
- Is text alignment appropriate (left-aligned for body, centre-aligned sparingly for headings)?

---

## 4. Colour System

### 4.1 Colour Palette Structure

Evaluate whether the colour system is intentional and consistent.

**Check:**
- Is there a defined primary brand colour used consistently for key actions?
- Is there a defined semantic colour system?
- Are neutral/grey tones used for backgrounds, borders, and secondary text?
- Is the palette limited (ideally 1 primary, 1 secondary, 1 accent + semantic colours + neutrals)?
- Are colour values consistent (not 15 slightly different greys)?

**Recommended Semantic Colour Map:**
```
Primary (Brand Blue/Green): Main CTAs, active states, links, selected items
Success (Green): Confirmations, completed states, positive metrics
Warning (Amber/Yellow): Caution states, pending items, non-critical alerts
Error/Destructive (Red): Errors, deletion, critical alerts, validation failures
Info (Blue): Informational banners, tooltips, help text
Neutral (Grey scale): Backgrounds, borders, disabled states, secondary text
```

### 4.2 Semantic Colour Usage

**Check:**
- Is the primary colour reserved for the most important actions ("Trust Blue")?
- Is red used exclusively for destructive/error states ("Urgency Red") — never for primary CTAs?
- Are success, warning, and error states using appropriate semantic colours?
- Is colour never the sole indicator of state (always paired with icons, text, or patterns)?
- Are hover and active states using darker/lighter variants of the base colour (not different hues)?

**Common Failures:**
- Red used as a primary CTA colour (creates anxiety, conflicts with error states)
- Green used for both "success" and primary actions (ambiguous)
- Colour as the only state indicator (inaccessible for colour-blind users)
- Hover states that change hue rather than lightness/darkness
- Inconsistent use of brand colours across pages

### 4.3 Dark Mode & Theming (if applicable)

**Check:**
- Does the dark mode use appropriately reduced contrast (not pure white on pure black)?
- Are semantic colours adjusted for dark backgrounds?
- Do images and illustrations work on both light and dark backgrounds?
- Is the theme toggle accessible and obvious?

**Dark Mode Guidelines:**
```
Background: #121212 to #1E1E1E (not pure #000000)
Surface: #1E1E1E to #2C2C2C
Primary text: #E0E0E0 to #FFFFFF (not pure white on dark surfaces)
Secondary text: #A0A0A0 to #B0B0B0
Elevation: lighter surfaces = higher elevation
```

---

## 5. Signifiers & Affordance

### 5.1 Interactive Element Recognition

Evaluate whether users can identify what is clickable, draggable, or interactive.

**Check:**
- Do buttons look like buttons (contained, contrasted, labelled)?
- Do links look like links (underlined or coloured, distinguishable from body text)?
- Are form inputs clearly bounded with visible borders or backgrounds?
- Do draggable items have drag handles or visual cues?
- Are clickable cards/rows distinguishable from static content?
- Do toggles, switches, and checkboxes have clear on/off states?

**What Good Looks Like:**
- Buttons: filled or outlined containers with padding, clear label text, cursor: pointer
- Links: coloured differently from body text, underlined on hover (or always)
- Inputs: visible border, adequate padding, placeholder text or floating label
- Cards: subtle shadow or border, hover state change, cursor: pointer if clickable
- Interactive icons: tooltip on hover, cursor: pointer, adequate hit area

**Common Failures:**
- Text that looks like a link but isn't (or vice versa)
- Buttons that look like plain text
- Clickable cards with no hover state or pointer cursor
- Icons without labels or tooltips
- Disabled elements that look active (or active elements that look disabled)

### 5.2 State Communication

Evaluate whether the UI communicates the current state of elements.

**Check:**
- Do navigation items clearly show which page/section is active?
- Do form fields show focus, error, success, and disabled states?
- Do selected items (tabs, filters, list items) have a clear selected state?
- Are greyed-out/disabled elements obviously different from active ones?
- Is the current position in multi-step processes clearly indicated?

**Required States for Interactive Elements:**
```
Default: Normal resting state
Hover: Visual change on mouse-over (desktop)
Focus: Visible outline for keyboard navigation (accessibility critical)
Active/Pressed: Brief state change during click/tap
Selected: Currently chosen option (tabs, toggles, radio buttons)
Disabled: Greyed out, reduced opacity, no pointer cursor
Loading: Spinner, skeleton, or progress indicator
Error: Red border, error message, icon
Success: Green border, checkmark, confirmation message
```

---

## 6. Interaction Design & Feedback

### 6.1 Button & Action States

Evaluate whether interactive elements provide appropriate feedback.

**Check:**
- Does every button have at least 4 visual states: default, hover, active/pressed, disabled?
- Do form submission buttons show a loading state during processing?
- Are destructive actions (delete, remove) behind a confirmation step?
- Do buttons have appropriate sizing (minimum 44×44px touch target, minimum 36px height on desktop)?
- Is there only one primary CTA per logical section?

**Button State Specification:**
```css
/* Default */
background: var(--primary);
opacity: 1;
cursor: pointer;

/* Hover */
background: var(--primary-dark);  /* 10-15% darker */
transform: translateY(-1px);      /* subtle lift (optional) */
box-shadow: 0 2px 4px rgba(0,0,0,0.1);

/* Active/Pressed */
background: var(--primary-darker); /* 20% darker */
transform: translateY(0);
box-shadow: none;

/* Disabled */
background: var(--grey-300);
color: var(--grey-500);
cursor: not-allowed;
opacity: 0.6;

/* Loading */
/* Replace label with spinner, maintain button width */
pointer-events: none;
```

### 6.2 Form Interaction

Evaluate the form experience.

**Check:**
- Do inputs provide real-time validation feedback (not just on submit)?
- Are error messages specific and positioned directly below the relevant field?
- Do required fields have clear indicators (asterisk, "Required" label)?
- Is tab order logical (left-to-right, top-to-bottom)?
- Do dropdowns, date pickers, and custom inputs work with keyboard navigation?
- Are multi-step forms showing progress and allowing back-navigation?
- Do forms preserve entered data on validation failure?

**Validation Timing:**
```
Email/URL fields: Validate on blur (when user leaves the field)
Password fields: Validate in real-time with strength indicator
Required fields: Validate on blur or on submit
Dependent fields: Validate when dependency changes
Format-specific (phone, postcode): Validate on blur with auto-formatting
```

**Error Message Format:**
```
✗ Bad:  "Invalid input"
✓ Good: "Please enter a valid email address (e.g. name@example.com)"

✗ Bad:  "Error"
✓ Good: "Password must be at least 8 characters with one number"

✗ Bad:  "Required"
✓ Good: "Please enter your company name to continue"
```

### 6.3 Micro-Interactions & System Feedback

Evaluate whether the system communicates responsively.

**Check:**
- Do actions produce immediate visual feedback (ripples, animations, state changes)?
- Are success confirmations shown for completed actions ("Saved", "Copied", "Sent")?
- Are loading states shown for any operation taking longer than 300ms?
- Are skeleton screens used instead of spinners for content loading?
- Do error states explain what went wrong and how to fix it?
- Are toast/snackbar notifications used for non-blocking confirmations?
- Do notifications auto-dismiss after an appropriate duration (3–5 seconds)?

**Feedback Timing Guidelines:**
```
0–100ms:    Instant feedback (button press, toggle, hover)
100–300ms:  Transition animations (panel open, accordion expand)
300ms–1s:   Show loading indicator if not yet complete
1–5s:       Show progress bar or detailed loading state
5s+:        Show progress percentage, allow cancellation, consider background processing
10s+:       Move to background with notification on completion
```

**Success Feedback Patterns:**
- Slide-up "success chip" for copy-to-clipboard actions
- Inline checkmark animation for save/update actions
- Toast notification for background operations
- Page redirect with success banner for form submissions
- Confetti or celebration animation for milestone completions (use sparingly)

---

## 7. Navigation & Wayfinding

### 7.1 Navigation Structure

**Check:**
- Is the primary navigation consistent across all pages?
- Can users reach any page within 3 clicks from the homepage?
- Is the current page/section clearly indicated in the navigation?
- Does the navigation hierarchy match the mental model of the content?
- Are navigation labels clear, concise, and descriptive (no jargon)?
- Is there a search function for content-heavy applications?

### 7.2 Breadcrumbs & Context

**Check:**
- Are breadcrumbs provided for hierarchical content (more than 2 levels deep)?
- Does the browser back button work as expected?
- Does the URL reflect the current page state?
- Are page titles descriptive and unique?
- Can users bookmark or share the current view?

### 7.3 Mobile Navigation

**Check:**
- Is the mobile navigation pattern appropriate (hamburger, tab bar, drawer)?
- Are critical navigation items accessible without opening a menu?
- Is the mobile menu easy to open and close?
- Are touch targets for navigation items at least 44×44px?
- Does the navigation support swipe gestures where appropriate?

---

## 8. Accessibility (WCAG 2.1 AA Compliance)

### 8.1 Perceivable

**Check:**
- All images have meaningful alt text (or empty alt="" for decorative images)
- Colour contrast meets WCAG AA: 4.5:1 for normal text, 3:1 for large text (18px+ bold or 24px+ regular)
- Information is not conveyed by colour alone (always paired with text, icons, or patterns)
- Video/audio content has captions or transcripts
- Text can be resized to 200% without loss of content or functionality
- Content is readable and functional without CSS

### 8.2 Operable

**Check:**
- All interactive elements are reachable via keyboard (Tab, Enter, Space, Escape, Arrow keys)
- Focus order is logical and follows visual layout
- Focus indicators are clearly visible (not just the browser default — use a custom `:focus-visible` style)
- No keyboard traps (user can always Tab away from an element)
- Skip links are available for screen reader users ("Skip to main content")
- Timed content can be paused, stopped, or extended
- No content flashes more than 3 times per second

**Focus Style Recommendation:**
```css
:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
  border-radius: 2px;
}

/* Remove default outline only when :focus-visible is supported */
:focus:not(:focus-visible) {
  outline: none;
}
```

### 8.3 Understandable

**Check:**
- Page language is declared (`<html lang="en">`)
- Form inputs have visible labels (not just placeholders)
- Error messages are clear, specific, and suggest corrections
- Navigation is consistent across pages
- No unexpected context changes (e.g. auto-submitting on select change)

### 8.4 Robust

**Check:**
- HTML is valid and well-structured
- ARIA roles and attributes are used correctly (or not at all — incorrect ARIA is worse than none)
- Custom components (dropdowns, modals, tabs) follow WAI-ARIA authoring practices
- Page works with screen readers (VoiceOver, NVDA)
- Interactive elements use semantic HTML where possible (`<button>`, `<a>`, `<input>` not `<div onclick>`)

---

## 9. Performance & Perceived Speed

### 9.1 Loading Experience

**Check:**
- Is there a meaningful first paint within 1.5 seconds?
- Are skeleton screens used for content-heavy pages?
- Are images lazy-loaded below the fold?
- Are fonts loaded with `font-display: swap` to prevent invisible text?
- Is the Largest Contentful Paint (LCP) under 2.5 seconds?
- Is Cumulative Layout Shift (CLS) under 0.1?

### 9.2 Perceived Performance Optimisations

**Check:**
- Are optimistic updates used where appropriate (show success before server confirms)?
- Are transitions smooth (60fps, no jank)?
- Are heavy computations debounced or throttled?
- Is progressive loading used for long lists (virtualisation or pagination)?
- Are empty states meaningful (not just blank screens)?

---

## 10. Empty States, Errors & Edge Cases

### 10.1 Empty States

**Check:**
- Does every list/table/feed have a designed empty state?
- Do empty states explain what the section is for and how to populate it?
- Do empty states include a clear CTA to add the first item?
- Are empty states visually pleasant (illustration, helpful copy)?

**Empty State Template:**
```
[Illustration or Icon]
[Descriptive Heading: "No projects yet"]
[Helpful Body: "Create your first project to start tracking your work."]
[CTA Button: "Create Project"]
```

### 10.2 Error States

**Check:**
- Are 404 pages designed and helpful (search, navigation, home link)?
- Are API error states handled gracefully (retry button, helpful message)?
- Do error pages maintain the application shell (navigation, branding)?
- Are network disconnection states handled?
- Can users recover from errors without losing their work?

### 10.3 Edge Cases

**Check:**
- How does the UI handle very long text (names, descriptions, URLs)?
- How does the UI handle very short content (single character names)?
- What happens with zero, one, and many items in lists?
- How do tables handle 3 rows vs 300 vs 3000?
- Are currency, date, and number formats appropriate for the target locale?
- What happens when JavaScript fails or is disabled?

---

## 11. Imagery & Media

### 11.1 Image Handling

**Check:**
- Are images appropriately sized and optimised (WebP/AVIF with fallbacks)?
- Do images have consistent aspect ratios within collections (cards, grids)?
- Are image overlays using linear gradients (not flat colour) to preserve visual content while maintaining text readability?
- Do avatars/thumbnails have appropriate fallbacks (initials, placeholder)?
- Are decorative images using `aria-hidden="true"` or empty alt text?

**Image Overlay Best Practice:**
```css
/* Use gradient overlays, not flat colour */
.hero-overlay {
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.7) 0%,
    rgba(0, 0, 0, 0.3) 40%,
    rgba(0, 0, 0, 0) 100%
  );
}

/* NOT this */
.hero-overlay-bad {
  background: rgba(0, 0, 0, 0.5);  /* Flat overlay - obscures everything equally */
}
```

### 11.2 Icons & Illustrations

**Check:**
- Is there a consistent icon style throughout (outline, filled, duotone)?
- Are icons sized consistently (16px, 20px, 24px — on the 4-point grid)?
- Do icons have text labels or tooltips for clarity?
- Are critical icons meaningful and universally understood?

---

## 12. Content & Copy

### 12.1 Microcopy Quality

**Check:**
- Are button labels action-oriented and specific ("Save Changes" not "Submit")?
- Are error messages human-readable and solution-oriented?
- Are placeholder texts helpful but not used as labels?
- Is the tone consistent throughout the application?
- Are labels concise and unambiguous?

**Button Label Guide:**
```
✗ Bad:  "Submit"     → ✓ Good: "Create Account"
✗ Bad:  "OK"         → ✓ Good: "Confirm Deletion"
✗ Bad:  "Cancel"     → ✓ Good: "Keep Editing" / "Discard Changes"
✗ Bad:  "Click Here" → ✓ Good: "View Documentation"
✗ Bad:  "Yes"        → ✓ Good: "Delete Project"
```

### 12.2 Content Scannability

**Check:**
- Are headings descriptive and informative?
- Is important information bolded or highlighted?
- Are lists used for multiple related items (instead of long paragraphs)?
- Are paragraphs short (3–4 lines maximum)?
- Is there a clear visual distinction between labels and values?

---

## 13. Consistency & Design System Adherence

### 13.1 Component Consistency

**Check:**
- Are similar components styled identically across all pages?
- Are button styles consistent (same padding, border-radius, font-size)?
- Are card styles consistent (same shadow, padding, border-radius)?
- Are form input styles consistent (same height, padding, border style)?
- Are modal/dialog patterns consistent?
- Are notification/alert patterns consistent?

### 13.2 Spacing & Sizing Consistency

**Check:**
- Are spacing values drawn from a defined scale (not arbitrary)?
- Are border-radius values consistent (e.g. all cards 8px, all buttons 6px, all inputs 6px)?
- Are shadow values consistent for the same elevation level?
- Are icon sizes consistent within the same context?

### 13.3 Naming & Labelling Consistency

**Check:**
- Is the same concept referred to by the same label throughout (not "Delete" on one page and "Remove" on another)?
- Are date formats consistent throughout?
- Are number formats consistent?
- Is capitalisation consistent (Title Case, Sentence case, or UPPERCASE — pick one pattern)?

---

## 14. Motion & Animation

### 14.1 Animation Purpose

**Check:**
- Does every animation serve a purpose (guiding attention, providing feedback, showing spatial relationships)?
- Are transitions smooth and appropriately timed (150–300ms for UI transitions)?
- Are there no animations that block or delay user interaction?
- Is `prefers-reduced-motion` respected for users who disable animations?

**Animation Timing Guide:**
```
Micro-interactions (hover, press): 100–150ms
Small transitions (toggle, fade): 150–250ms
Medium transitions (panel slide, expand): 250–350ms
Large transitions (page, modal): 300–500ms
Easing: Use ease-out for entering, ease-in for exiting, ease-in-out for moving
```

### 14.2 Animation Quality

**Check:**
- Are animations using CSS transforms and opacity (GPU-accelerated)?
- Are animations running at 60fps (no jank or stuttering)?
- Do enter/exit animations have appropriate easing curves?
- Are animations consistent in style across the application?

---

## 15. Cross-Browser & Device Considerations

### 15.1 Browser Compatibility

**Check:**
- Does the application work in Chrome, Firefox, Safari, and Edge (latest 2 versions)?
- Are CSS features using appropriate fallbacks or progressive enhancement?
- Are vendor prefixes included where necessary?
- Are there no console errors or warnings?

### 15.2 Device-Specific Considerations

**Check:**
- Are hover states not relied upon for mobile (no content hidden behind hover-only triggers)?
- Are touch interactions appropriate (swipe, pinch-to-zoom, long-press)?
- Is the viewport meta tag set correctly (`<meta name="viewport" content="width=device-width, initial-scale=1">`)?
- Does the application work in both portrait and landscape orientations?
- Are native input types used for appropriate fields (email, tel, number, date)?

---

## Evaluation Output Format

When conducting a UI/UX evaluation, structure your findings as follows:

### Summary

Provide an executive summary with:
- Overall quality rating (1–10)
- Top 3 strengths
- Top 3 critical issues
- Estimated effort to resolve critical issues

### Detailed Findings

For each finding, use this structure:

```
### [Section] — [Finding Title]

**Severity:** 🔴 Critical / 🟠 Major / 🟡 Minor / 🟢 Pass
**Category:** [Visual Hierarchy / Layout / Typography / Colour / etc.]
**Location:** [Specific page, component, or screen]

**What was found:**
[Description of the current state]

**Why it matters:**
[Impact on users, business, or accessibility]

**Recommendation:**
[Specific, actionable fix with code example if applicable]

**Effort:** Low / Medium / High
```

### Prioritised Action Plan

Group recommendations by effort and impact:

1. **Quick Wins** (Low effort, High impact) — Do these first
2. **Strategic Improvements** (Medium effort, High impact) — Plan for next sprint
3. **Polish Items** (Low effort, Low impact) — Nice-to-haves
4. **Major Refactors** (High effort, High impact) — Plan for dedicated work

---

## Quick Audit Checklist

Use this for a rapid pre-launch pass. Each item is a yes/no check.

### Visual Design
- [ ] Clear visual hierarchy — primary content is immediately obvious
- [ ] Consistent spacing on a 4-point grid
- [ ] Typography scale with tightened header letter-spacing (-2%)
- [ ] Limited, intentional colour palette with semantic usage
- [ ] Consistent component styling across all pages

### Interaction Design
- [ ] All buttons have hover, active, and disabled states
- [ ] Forms have real-time validation with clear error messages
- [ ] Loading states shown for any operation >300ms
- [ ] Success confirmations shown for completed actions
- [ ] Destructive actions require confirmation

### Accessibility
- [ ] Colour contrast meets WCAG AA (4.5:1 text, 3:1 large text)
- [ ] All interactive elements keyboard-accessible
- [ ] Focus indicators clearly visible
- [ ] Images have appropriate alt text
- [ ] No information conveyed by colour alone

### Responsiveness
- [ ] Layout works from 320px to 1920px width
- [ ] Touch targets minimum 44×44px on mobile
- [ ] No horizontal scrolling on any device
- [ ] Navigation adapts appropriately per breakpoint

### Content
- [ ] Meaningful empty states with CTAs
- [ ] Designed error states (404, API errors, network issues)
- [ ] Action-oriented button labels
- [ ] Consistent terminology throughout

### Performance
- [ ] First meaningful paint under 1.5 seconds
- [ ] No layout shift during loading
- [ ] Images optimised and lazy-loaded
- [ ] Smooth 60fps animations

---

## Appendix: CSS Utility Classes for Common Fixes

When you identify issues, these utility classes can provide quick fixes:

```css
/* Typography Fixes */
.heading-tight {
  letter-spacing: -0.02em;
  line-height: 1.1;
}

.body-comfortable {
  font-size: 1rem;
  line-height: 1.6;
  letter-spacing: -0.01em;
}

/* Spacing Scale (4-point grid) */
.gap-1  { gap: 4px; }
.gap-2  { gap: 8px; }
.gap-3  { gap: 12px; }
.gap-4  { gap: 16px; }
.gap-6  { gap: 24px; }
.gap-8  { gap: 32px; }
.gap-10 { gap: 40px; }
.gap-12 { gap: 48px; }

/* Focus Visible */
*:focus-visible {
  outline: 2px solid var(--colour-primary);
  outline-offset: 2px;
}

/* Gradient Overlay */
.overlay-gradient {
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.7) 0%,
    rgba(0, 0, 0, 0.3) 40%,
    transparent 100%
  );
}

/* Reduced Motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

*This framework is based on established UI/UX principles including WCAG 2.1 AA guidelines, Material Design principles, Apple Human Interface Guidelines, and practical frontend development standards. Last updated: 20/03/2026.*
