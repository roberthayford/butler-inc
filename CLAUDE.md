# Butlers Inc. — Claude Code Instructions

## Project Overview

Premium concierge service website. Next.js 16 (App Router), React 19, Tailwind CSS v4, Supabase (auth + database), Vitest + Testing Library.

## UI/UX Evaluation

**Before evaluating, auditing, or making UI/UX changes**, always follow the framework in:
```
docs/ui-ux-evaluation-framework.md
```

The framework defines severity ratings (🔴 Critical, 🟠 Major, 🟡 Minor, 🟢 Pass), evaluation sections, and the required output format. All UI/UX work must reference it.

The latest audit report is at `docs/ui-ux-audit-2026-03-20.md`.

## Testing

- **Test runner:** `npm run test:run` (Vitest, jsdom)
- **Watch mode:** `npm test`
- **Test utilities:** `src/test/test-utils.tsx` — use this for all renders (wraps QueryClientProvider, mocks next/navigation, next/link, next/image)
- All tests live at `src/**/__tests__/*.test.tsx`

## Development

- **Dev server:** `npm run dev`
- **Build:** `npm run build`
- **Lint:** `npm run lint`

## Key Conventions

- Dark-first UI: charcoal background (`hsl(220 20% 18%)`), brass accent, optical-white text
- Font pairing: Cormorant Garamond (serif, headings) + Inter (sans, body)
- Border radius: 1–2px ("architectural precision") — use `rounded-sm` not `rounded-lg`
- Motion: Framer Motion (`motion/react`) for entrance animations — keep tasteful, always `viewport={{ once: true }}`
- Components: shadcn/ui primitives in `src/components/ui/`
- Data: static service config in `src/data/` — `services.ts`, `booking-config.ts`, `butler-page-configs.ts`
- Auth: Supabase via `src/context/AuthContext.tsx`

## Architecture

```
src/app/                    # Next.js App Router pages
  page.tsx                  # Homepage
  butlers/
    layout.tsx              # Provides Header + Footer to all /butlers routes
    page.tsx                # /butlers listing page
    [id]/page.tsx           # Individual butler page (booking flow lives here)
  members/
    login/page.tsx          # Auth pages
    signup/page.tsx
    dashboard/page.tsx      # Booking history
  admin/page.tsx            # Content editor (authenticated)
  booking-confirmation/     # Post-booking confirmation

src/components/
  landing/                  # Header, Hero, Footer, HowItWorks, ButlerCategoryGrid
  booking/                  # BookingFlow, BookingForm, ServiceOptionSelector
  ui/                       # shadcn primitives

src/data/                   # Static config (services, booking options, butler page content)
src/lib/                    # Supabase client, content merge utilities
```
