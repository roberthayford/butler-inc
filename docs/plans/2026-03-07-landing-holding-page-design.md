# Landing/Holding Page Design

**Date:** 2026-03-07
**Branch:** `landong-holding`
**Domain:** butlersinc.com

## Goal

Strip `landong-holding` to a single-page holding site — no subpages, no dead routes. Optimised for search engines, AI crawlers, and social sharing.

## 1. Route Cleanup

Delete all non-landing routes and their dependencies:

- `src/app/butlers/` (page, [id], layout)
- `src/app/members/` (login, signup, dashboard)
- `src/app/booking-confirmation/`
- `src/app/api/bookings/`
- `src/app/not-found.tsx`
- `src/app/template.tsx`

Clean up `next.config.ts` redirects (no routes to redirect to).

Keep: `page.tsx`, `layout.tsx`, `globals.css`, shared UI components used by the landing page.

## 2. Landing Page Updates

- Update contact email: `enquiries@butlersinc.co.uk` -> `hello@butlersinc.com`
- Add minimal "What We Offer" section below the hero
  - 6 one-liners, one per butler type
  - Example: "Busy Butler — Same-day courier and urgent errands"
  - Elegant styling consistent with existing hero aesthetic
  - No links to subpages

## 3. SEO Metadata (layout.tsx)

- Title: "Butlers Inc. | Premium Concierge Service — Coming Soon"
- Description: Rich description mentioning services, England, pricing
- Open Graph tags: title, description, type (`website`), url, site_name
- Twitter card: `summary_large_image`
- Canonical URL: `https://butlersinc.com`

## 4. robots.txt (app/robots.ts)

- Allow all crawlers
- Reference sitemap at `https://butlersinc.com/sitemap.xml`

## 5. sitemap.xml (app/sitemap.ts)

- Single entry: `https://butlersinc.com`

## 6. llms.txt (public/llms.txt)

Plain-text file for AI crawlers describing:
- Business name and what it does
- Six butler service types with one-line descriptions
- Contact email
- Location (England)
- Status (launching soon)

## 7. Structured Data (JSON-LD in layout)

- `Organization` schema: name, url, email, description, areaServed
- `WebSite` schema: name, url

## Out of Scope

- Social media links (none at this time)
- Full platform features (live on `non-member-user-journey` branch)
- Analytics/tracking
