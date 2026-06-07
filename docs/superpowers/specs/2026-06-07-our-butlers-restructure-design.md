# Design: "Our Butlers" page restructure + new "provide information" step

Status: **design only** (implement in a later session). Branch: staging.
Source: Farida feedback 6 Jun, "Formatting" section.

## What Farida asked for

> At the top of the page, when you click Our Butlers, it should first break down what the butlers are and then below that have the steps. I think between 1 and 2, there should be a step for providing further information. That is the step that will cover the process for picking up the keys, getting information about the schools, etc.

Two changes:
1. **Reorder/add intro:** lead with "what the butlers are" (a breakdown), THEN the steps.
2. **Insert a new step between current step 1 and step 2** for "providing further information" (key collection, school details, etc.).

## Current state

`src/app/butlers/page.tsx` renders: hero header → `<HowItWorks />` → `<ButlerCategoryGrid showHeader={false} />`.

`src/components/landing/HowItWorks.tsx` has 4 generic steps:
1. Choose Your Butler Service
2. Book Your Slot
3. We Arrive
4. We Hand Over

## Proposed approach

1. **Intro "what the butlers are":** add a section above `HowItWorks` on the `/butlers` page (or make `ButlerCategoryGrid` lead with its own explanatory header). Simplest: render the category grid (the "what") first or add a short explanatory block, then the steps. Confirm with Farida whether "break down what the butlers are" = the existing six-card grid moved above the steps, or new explanatory prose.
2. **New step between 1 and 2:** insert "Provide Information" into the `STEPS` array, renumbering to 5 steps:
   1. Choose Your Butler Service
   2. **Provide Information** (key collection, school details, access, etc.)
   3. Book Your Slot
   4. We Arrive
   5. We Hand Over

   Note: `HowItWorks` is also used on the homepage. Decide whether the new step applies everywhere or only on `/butlers`. The grid is `lg:grid-cols-4`; 5 steps needs a layout tweak (e.g. `lg:grid-cols-5` or 3+2).

## Open questions
- "Break down what the butlers are" — reorder the existing grid above the steps, or add new prose? (Recommend: move grid up / add a one-line intro; avoid net-new copy that needs founder sign-off.)
- Does the 5-step flow apply to the homepage `HowItWorks` too, or only `/butlers`?
- Exact copy for the "Provide Information" step description (founder to confirm; covers keys, schools, access).

## Components touched
- `src/app/butlers/page.tsx` (section order)
- `src/components/landing/HowItWorks.tsx` (new step, layout, possibly a prop to vary steps per page)

## Copy rule
No em dashes.
