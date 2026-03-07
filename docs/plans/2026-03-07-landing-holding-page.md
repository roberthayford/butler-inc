# Landing/Holding Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Strip `landong-holding` branch to a single SEO-optimised holding page with no subpages, crawlable by search engines and AI bots.

**Architecture:** Delete all routes except `/`. Simplify `Providers` to remove auth/query dependencies. Add SEO files (robots.ts, sitemap.ts, llms.txt) and structured data (JSON-LD). Add a minimal services overview section below the hero.

**Tech Stack:** Next.js 16, React 19, Tailwind 4, TypeScript

---

### Task 1: Delete non-landing routes

**Files:**
- Delete: `src/app/butlers/` (entire directory)
- Delete: `src/app/members/` (entire directory)
- Delete: `src/app/booking-confirmation/` (entire directory)
- Delete: `src/app/api/` (entire directory)
- Delete: `src/app/not-found.tsx`
- Delete: `src/app/template.tsx`

**Step 1: Delete all route directories and files**

```bash
rm -rf src/app/butlers src/app/members src/app/booking-confirmation src/app/api
rm src/app/not-found.tsx src/app/template.tsx
```

**Step 2: Verify only landing files remain in src/app/**

```bash
ls -la src/app/
```

Expected: `layout.tsx`, `page.tsx`, `globals.css` (and soon robots.ts, sitemap.ts)

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove all non-landing routes for holding page"
```

---

### Task 2: Delete unused components, data, context, and lib files

**Files:**
- Delete: `src/components/booking/` (entire directory)
- Delete: `src/components/butler-page-sections.tsx`
- Delete: `src/components/landing/ButlerCategoryGrid.tsx`
- Delete: `src/components/landing/Header.tsx`
- Delete: `src/components/landing/Hero.tsx`
- Delete: `src/components/landing/Footer.tsx`
- Delete: `src/data/butler-page-configs.ts`
- Delete: `src/data/butler-tasks.ts`
- Delete: `src/data/services.ts`
- Delete: `src/context/` (entire directory)
- Delete: `src/lib/supabase/` (entire directory)

These files supported the full platform. The holding page only uses `LandingHeroBackground` from `src/components/ui/hero-background.tsx`.

**Step 1: Delete unused files**

```bash
rm -rf src/components/booking src/context src/lib/supabase
rm src/components/butler-page-sections.tsx
rm src/components/landing/ButlerCategoryGrid.tsx src/components/landing/Header.tsx src/components/landing/Hero.tsx src/components/landing/Footer.tsx
rm src/data/butler-page-configs.ts src/data/butler-tasks.ts src/data/services.ts
```

**Step 2: Fix hero-background.tsx — remove HeroBackground and ServiceId import**

The file currently exports both `HeroBackground` (used by butler pages) and `LandingHeroBackground` (used by holding page). Remove `HeroBackground` and the `services`/`ServiceId` imports. The resulting file should only contain `LandingHeroBackground`:

```tsx
import Image from "next/image";

const NOISE_SVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`;

export function LandingHeroBackground({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 100%, hsla(30, 45%, 35%, 0.10) 0%, transparent 60%), " +
            "radial-gradient(ellipse 60% 40% at 80% 20%, hsla(30, 30%, 45%, 0.06) 0%, transparent 50%), " +
            "radial-gradient(ellipse 40% 30% at 10% 40%, hsla(220, 30%, 25%, 0.15) 0%, transparent 50%), " +
            "linear-gradient(to bottom, hsl(220, 20%, 15%), hsl(220, 20%, 18%))",
        }}
      />

      <div className="absolute inset-0 z-0 overflow-hidden opacity-30 mix-blend-luminosity pointer-events-none">
        <Image
          src="/images/hero-butler.png"
          alt="Premium concierge background"
          fill
          priority
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/80 to-charcoal/40" />
      </div>

      <div
        className="absolute inset-0 opacity-40 mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: NOISE_SVG,
          backgroundRepeat: "repeat",
          backgroundSize: "256px 256px",
        }}
      />

      <div className="relative z-10">{children}</div>
    </div>
  );
}
```

**Step 3: Simplify src/components/providers.tsx**

The holding page does not need auth, react-query, or toaster. Replace with:

```tsx
"use client";

import { ThemeProvider } from "next-themes";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark">
      {children}
    </ThemeProvider>
  );
}
```

Note: `defaultTheme` changed to `"dark"` since the holding page is dark-themed.

**Step 4: Verify the build compiles**

```bash
npm run build
```

Expected: Build succeeds with no import errors.

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove unused components, data, context for holding page"
```

---

### Task 3: Clean up next.config.ts

**Files:**
- Modify: `next.config.ts`

**Step 1: Remove redirects (no routes to redirect to)**

Replace the entire file with:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;
```

**Step 2: Commit**

```bash
git add next.config.ts
git commit -m "chore: remove unused redirects from next.config"
```

---

### Task 4: Update contact email and add services section to page.tsx

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Update the page**

Replace `src/app/page.tsx` with:

```tsx
import { LandingHeroBackground } from "@/components/ui/hero-background";

const SERVICES = [
  { name: "Busy Butler", desc: "Same-day courier and urgent errands" },
  { name: "Baby Butler", desc: "School runs, childcare, and welfare checks" },
  { name: "Bougie Butler", desc: "Luxury sourcing and VIP experiences" },
  { name: "Base Butler", desc: "Property waiting and home management" },
  { name: "Budget Butler", desc: "Flexible-timing errands at the best rates" },
  { name: "Bespoke Butler", desc: "Custom requests — if you can describe it, consider it arranged" },
] as const;

export default function Home() {
  return (
    <main id="main-content" className="min-h-screen bg-charcoal">
      <LandingHeroBackground className="min-h-screen relative w-full">
        <div className="min-h-screen flex flex-col">
          {/* Hero */}
          <div className="flex-1 flex items-center justify-center px-6">
            <div className="text-center max-w-4xl mx-auto">
              <p
                className="text-2xl md:text-3xl font-serif font-bold text-optical-white tracking-wide text-shadow-crisp mb-10 md:mb-14"
                style={{ animation: "fade-up 0.7s ease-out forwards" }}
              >
                Butlers Inc.
              </p>

              <h1
                className="text-5xl sm:text-6xl md:text-7xl lg:text-[5rem] font-serif font-medium text-optical-white tracking-tight leading-tight text-balance text-shadow-crisp opacity-0"
                style={{ animation: "fade-up 0.7s ease-out 100ms forwards" }}
              >
                At Your Service.
                <br className="hidden sm:block" />{" "}
                <span className="italic">Shortly.</span>
              </h1>

              <p
                className="mt-8 text-lg sm:text-xl md:text-2xl text-optical-white/80 leading-relaxed font-sans max-w-xl mx-auto opacity-0"
                style={{ animation: "fade-up 0.7s ease-out 150ms forwards" }}
              >
                The new standard in premium concierge across England is being
                prepared.
              </p>

              <div
                className="mt-14 opacity-0"
                style={{ animation: "fade-up 0.7s ease-out 300ms forwards" }}
              >
                <a
                  href="mailto:hello@butlersinc.com"
                  className="inline-flex items-center justify-center h-14 px-8 text-sm md:text-base font-medium transition-all duration-300 active:scale-[0.98] border border-brass text-optical-white hover:bg-brass/10 hover:border-brass/70 rounded-sm uppercase tracking-widest bg-charcoal/40 backdrop-blur-sm shadow-sm hover:-translate-y-1 hover:shadow-2xl"
                >
                  Get in Touch
                </a>
              </div>
            </div>
          </div>

          {/* Services Overview */}
          <section
            className="px-6 pb-16 opacity-0"
            style={{ animation: "fade-up 0.7s ease-out 450ms forwards" }}
          >
            <div className="max-w-2xl mx-auto">
              <h2 className="text-center text-xs uppercase tracking-[0.25em] text-optical-white/50 mb-8 font-sans">
                What We Offer
              </h2>
              <ul className="space-y-3">
                {SERVICES.map((s) => (
                  <li
                    key={s.name}
                    className="text-center text-sm sm:text-base text-optical-white/70 font-sans leading-relaxed"
                  >
                    <span className="text-optical-white font-medium">{s.name}</span>
                    <span className="text-optical-white/30 mx-2">&mdash;</span>
                    {s.desc}
                  </li>
                ))}
              </ul>
              <p className="text-center text-xs text-optical-white/30 mt-8 uppercase tracking-widest">
                From &pound;35/hr
              </p>
            </div>
          </section>

          {/* Footer */}
          <footer
            className="shrink-0 p-6 md:p-10 text-center text-xs uppercase tracking-widest text-optical-white/40 opacity-0"
            style={{ animation: "fade-in 1s ease-out 600ms forwards" }}
          >
            <p>
              &copy; {new Date().getFullYear()} Butlers Inc. All rights
              reserved.
            </p>
          </footer>
        </div>
      </LandingHeroBackground>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `,
        }}
      />
    </main>
  );
}
```

Key changes:
- Email: `hello@butlersinc.com`
- CTA text: "Get in Touch" (simpler than "Contact Enquiries")
- Changed `Link` to `<a>` (mailto does not need Next.js routing)
- Added "What We Offer" section with 6 service one-liners
- Added "From GBP 35/hr" below the list

**Step 2: Verify dev server renders correctly**

```bash
npm run dev
```

Open `http://localhost:3000` and verify the hero + services section renders.

**Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: update contact email and add services overview section"
```

---

### Task 5: SEO metadata in layout.tsx

**Files:**
- Modify: `src/app/layout.tsx`

**Step 1: Update layout with full SEO metadata and JSON-LD**

Replace `src/app/layout.tsx` with:

```tsx
import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const serif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

const SITE_URL = "https://butlersinc.com";

export const metadata: Metadata = {
  title: "Butlers Inc. | Premium Concierge Service — Coming Soon",
  description:
    "Premium personal concierge service across England. Same-day couriers, childcare, luxury sourcing, property management, and bespoke requests. From £35/hr. Launching soon.",
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: "Butlers Inc. | Premium Concierge Service — Coming Soon",
    description:
      "The new standard in premium concierge across England. Six specialist butler services from £35/hr.",
    url: SITE_URL,
    siteName: "Butlers Inc.",
    type: "website",
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title: "Butlers Inc. | Premium Concierge — Coming Soon",
    description:
      "Premium personal concierge across England. Six specialist butler services from £35/hr.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "Butlers Inc.",
      url: SITE_URL,
      email: "hello@butlersinc.com",
      description:
        "Premium personal concierge service across England offering same-day couriers, childcare, luxury sourcing, property management, and bespoke requests.",
      areaServed: {
        "@type": "Country",
        name: "England",
      },
    },
    {
      "@type": "WebSite",
      name: "Butlers Inc.",
      url: SITE_URL,
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

Note: The JSON-LD content is entirely static hardcoded data — no user input, no XSS risk.

**Step 2: Build to verify metadata**

```bash
npm run build
```

**Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: add comprehensive SEO metadata and JSON-LD structured data"
```

---

### Task 6: Add robots.ts and sitemap.ts

**Files:**
- Create: `src/app/robots.ts`
- Create: `src/app/sitemap.ts`

**Step 1: Create robots.ts**

```typescript
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: "https://butlersinc.com/sitemap.xml",
  };
}
```

**Step 2: Create sitemap.ts**

```typescript
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://butlersinc.com",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
```

**Step 3: Build and verify**

```bash
npm run build
```

Then start the server and verify the generated files:
```bash
npm run start
# In another terminal:
curl http://localhost:3000/robots.txt
curl http://localhost:3000/sitemap.xml
```

**Step 4: Commit**

```bash
git add src/app/robots.ts src/app/sitemap.ts
git commit -m "feat: add robots.txt and sitemap.xml for SEO"
```

---

### Task 7: Add llms.txt for AI crawlers

**Files:**
- Create: `public/llms.txt`

**Step 1: Create the file**

```text
# Butlers Inc.

> Premium personal concierge service across England. Launching soon.

## About

Butlers Inc. is the new standard in premium concierge. We provide trusted, DBS-checked professionals who handle life's tasks — from urgent same-day errands to luxury sourcing and bespoke event coordination. Based in England, serving nationwide.

## Services

- Busy Butler: Same-day courier, urgent errands, and professional logistics. From GBP 35/hr.
- Baby Butler: School runs, emergency childcare, and elderly welfare checks. DBS-checked, body-cam equipped. From GBP 35/hr.
- Bougie Butler: Luxury sourcing, VIP reservations, rare finds, and exclusive experiences. From GBP 35/hr.
- Base Butler: Property waiting, key holding, tradesman coordination, and home preparation. From GBP 35/hr.
- Budget Butler: Flexible-timing errands at the best rates — grocery shopping, plant care, returns. From GBP 35/hr.
- Bespoke Butler: Custom requests for complex coordination, special occasions, and unique challenges. Quote-based.

## Contact

- Email: hello@butlersinc.com
- Website: https://butlersinc.com

## Status

Launching soon. Currently accepting enquiries via email.
```

**Step 2: Verify it is served**

```bash
npm run dev
# In another terminal:
curl http://localhost:3000/llms.txt
```

**Step 3: Commit**

```bash
git add public/llms.txt
git commit -m "feat: add llms.txt for AI crawler discoverability"
```

---

### Task 8: Final build verification

**Step 1: Full build**

```bash
npm run build
```

Expected: Build succeeds, single page output.

**Step 2: Run production server and verify**

```bash
npm run start
```

Verify:
- `http://localhost:3000` — hero + services section + footer renders
- `http://localhost:3000/robots.txt` — allows all, references sitemap
- `http://localhost:3000/sitemap.xml` — single entry for butlersinc.com
- `http://localhost:3000/llms.txt` — plain text business description
- View page source — JSON-LD script tag present, OG/Twitter meta tags present

**Step 3: Commit any fixes if needed**
