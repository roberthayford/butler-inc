# Butlers Inc. Phase 1 MVP — Next.js Migration + Implementation Plan

> Last updated: February 27, 2026
> Status: Ready for implementation
> Branch: `non-member-user-journey`
> Design doc: `docs/plans/2026-02-21-phase1-mvp-revised-design.md`

**Goal:** Migrate from React+Vite SPA to Next.js App Router, then build the complete non-member booking flow, member auth, and simplified landing page — incorporating Faridah's butler task taxonomy and corrected pricing.

**Architecture:** Next.js App Router with file-based routing. 2-phase booking flow (service selection → combined form) on a dynamic page (`/butlers/[id]`). Supabase for auth + database. Next.js Route Handler for booking submission + Resend email. Vercel hosting.

**Tech Stack:** Next.js (latest) + React + TypeScript + Tailwind + shadcn/ui (latest) + lucide-react (latest) + Framer Motion + React Hook Form + Zod + Vitest + Supabase + Resend

---

## Context

The existing codebase is a React 18 + Vite 5 SPA with React Router 6. It has 6 static butler pages with an over-engineered reservation form (postcode, address, duration, off-peak/standard/premium pricing). This plan replaces the entire build system with Next.js and implements the MVP booking flow simultaneously.

**Key sources:**
- `docs/butler-options-and-tasks.md` — Faridah's complete task taxonomy
- `docs/plans/2026-02-21-phase1-mvp-revised-design.md` — Corrected design spec
- `docs/infrastructure-research.md` — Architecture decisions

**Key migration patterns:**
- `react-router-dom` Link → `next/link` Link (`to=` → `href=`)
- `useNavigate()` → `useRouter()` from `next/navigation`
- `useLocation()` → `useSearchParams()` / `usePathname()` from `next/navigation`
- Manual `document.title` / meta tags → `export const metadata` / `generateMetadata()`
- `VITE_` env vars → `NEXT_PUBLIC_` env vars
- Google Fonts via `@import` → `next/font/google`
- `<img>` → `<Image>` from `next/image`
- Supabase single client → separate browser + server clients via `@supabase/ssr`
- `ProtectedRoute` component → Next.js `middleware.ts`

---

## Phase 0: Project Scaffold

### Task 0.1: Backup current code and scaffold Next.js

**Step 1: Create backup branch**
```bash
git checkout -b archive/react-vite-version
git push origin archive/react-vite-version
git checkout non-member-user-journey
```

**Step 2: Preserve files we need**
Copy these to a temp directory outside the repo before scaffolding:
- `src/index.css` (design tokens)
- `src/data/` (all data files)
- `src/components/landing/` (Header, Hero, ButlerCategoryGrid, Footer)
- `tailwind.config.ts` (custom colors, fonts, animations)
- `public/` (images, favicon, robots.txt)
- `docs/` (all documentation)
- `.claude/` (memory files)

**Step 3: Clear repo and scaffold**
```bash
# Remove all source files (keep .git, docs, .claude)
rm -rf src/ public/ index.html vite.config.ts tsconfig*.json postcss.config.js package.json package-lock.json node_modules/ components.json eslint.config.js bun.lockb playwright.config.ts

# Scaffold Next.js in current directory
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --turbopack
```

**create-next-app options:**
- TypeScript: Yes
- ESLint: Yes
- Tailwind CSS: Yes
- `src/` directory: Yes
- App Router: Yes
- Turbopack: Yes
- Import alias `@/*`: Yes (matches existing)

**Step 4: Initialize shadcn/ui**
```bash
npx shadcn@latest init
```
Select: Default style, Slate base color, CSS variables: Yes

**Step 5: Install shadcn components (only what MVP needs)**
```bash
npx shadcn@latest add button accordion tooltip sonner form input textarea separator checkbox label calendar card
```

**Step 6: Install lucide-react and other dependencies**
```bash
npm install lucide-react@latest
npm install @tanstack/react-query react-hook-form @hookform/resolvers zod
npm install framer-motion date-fns next-themes
npm install @supabase/supabase-js @supabase/ssr resend
```

**Step 7: Install dev dependencies**
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @vitejs/plugin-react-swc tailwindcss-animate
```

**Step 8: Restore preserved files**
- Copy `docs/` back
- Copy `.claude/` back
- Copy `public/images/`, `public/favicon.*`, `public/robots.txt` back
- Copy `src/data/` files to `src/data/`

**Step 9: Commit**
```bash
git commit -m "chore: scaffold Next.js project with shadcn/ui and dependencies"
```

---

### Task 0.2: Configure design tokens and Tailwind

**Files:**
- Overwrite: `src/app/globals.css` (merge design tokens from old `index.css`)
- Modify: `tailwind.config.ts` (add custom colors, fonts, animations)
- Modify: `src/app/layout.tsx` (set up `next/font/google`)

**Step 1: Merge design tokens into `globals.css`**

Copy all CSS custom properties (`:root` and `.dark` blocks), custom component classes (`section-padding`, `container-narrow`, `hero-overlay`, `hero-cta-outline`, `hero-cta-solid`, `hero-segmented-control`, glass-morphism effects, `text-shadow-crisp`, animations), and utility classes from old `src/index.css`.

Remove the `@import url('https://fonts.googleapis.com/...')` line — fonts handled by `next/font`.

**Step 2: Update `tailwind.config.ts`**

Merge from old config:
- Custom colors: `cream`, `ivory`, `charcoal`, `brass`, `brass-muted`, `optical-white`, `sage`, `sage-light`, `warm-gray`
- Font families: reference CSS variables from `next/font` (`var(--font-serif)`, `var(--font-sans)`)
- Keyframes: `fade-up`, `fade-in`, `accordion-down`, `accordion-up`
- Plugin: `require("tailwindcss-animate")`
- Content paths: `["./src/**/*.{ts,tsx}"]`

> **Note:** If `create-next-app@latest` ships Tailwind 4 (CSS-based config), adapt accordingly — move theme customizations to `globals.css` using `@theme` blocks. Check shadcn compatibility docs at execution time.

**Step 3: Set up fonts in `layout.tsx`**

```typescript
import { Cormorant_Garamond, Inter } from 'next/font/google';

const serif = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-serif',
  display: 'swap',
});

const sans = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-sans',
  display: 'swap',
});
```

Apply to `<html className={`${serif.variable} ${sans.variable}`}>`.

**Step 4: Verify** — `npm run dev` shows the default Next.js page with correct fonts and colors.

**Step 5: Commit**
```bash
git commit -m "feat: configure design tokens, Tailwind, and Next.js fonts"
```

---

### Task 0.3: Set up Vitest and test utilities

**Files:**
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Create: `src/test/test-utils.tsx`
- Modify: `package.json` (add test scripts)

**`vitest.config.ts`** — same as original plan but with Next.js mocks in test-utils.

**`src/test/test-utils.tsx`** — includes mocks for `next/navigation` and `next/link`:
```typescript
import { render, type RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactElement } from 'react';
import { vi } from 'vitest';

// Mock Next.js modules
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  notFound: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

const createTestQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

function AllProviders({ children }: { children: React.ReactNode }) {
  const queryClient = createTestQueryClient();
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const customRender = (ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) =>
  render(ui, { wrapper: AllProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };
```

**Test scripts in `package.json`:**
```json
"test": "vitest",
"test:run": "vitest run",
"test:coverage": "vitest run --coverage"
```

**Verify:** `npx vitest run` passes with 0 test suites.

**Commit:** `chore: configure vitest with Next.js mocks and testing-library`

---

### Task 0.4: Set up providers and root layout

**Files:**
- Create: `src/components/providers.tsx`
- Modify: `src/app/layout.tsx`

**`src/components/providers.tsx`** (`'use client'`):
```typescript
'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from 'next-themes';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light">
        <TooltipProvider>
          {children}
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
```

> **Note:** `AuthProvider` is added here in Phase 3 after Supabase is set up.

**`src/app/layout.tsx`**: Root layout with fonts, metadata, and Providers wrapper.

```typescript
export const metadata: Metadata = {
  title: { default: 'Butlers Inc. | Premium Concierge Service', template: '%s | Butlers Inc.' },
  description: 'Your personal butler, on demand. Across England. From £35/hr.',
};
```

**`src/app/not-found.tsx`**: Simple 404 page (adapt from old `NotFound.tsx`, use `next/link`).

**Commit:** `feat: set up root layout with providers and global metadata`

---

## Phase 1: Data Layer Updates

### Task 1.1: Create booking-config with 3-tier pricing

Create `src/data/booking-config.ts` and test.

- `DAY_OPTIONS`: Same Day £70, Next Day £55, 72hrs+ £35
- `TIME_SLOTS`: Morning, Noon, Evening
- Types: `DayOptionKey`, `TimeSlotKey`

```typescript
export const DAY_OPTIONS = [
  { key: 'sameDay', label: 'Same Day', priceLabel: 'from £70/hr', priceFrom: 70 },
  { key: 'nextDay', label: 'Next Day', priceLabel: 'from £55/hr', priceFrom: 55 },
  { key: 'advance', label: '72+ Hours Notice', priceLabel: 'from £35/hr', priceFrom: 35, requiresDatePicker: true },
] as const;

export const TIME_SLOTS = [
  { key: 'morning', label: 'Morning', times: '7:00 - 11:59' },
  { key: 'noon', label: 'Noon', times: '12:00 - 16:59' },
  { key: 'evening', label: 'Evening', times: '17:00 - 21:00' },
] as const;

export type DayOptionKey = typeof DAY_OPTIONS[number]['key'];
export type TimeSlotKey = typeof TIME_SLOTS[number]['key'];
```

**Commit:** `feat: add 3-tier day pricing and time slot config`

### Task 1.2: Update services.ts prices to £35

All non-bespoke services → `"£35"`.

| Butler | Current | New |
|--------|---------|-----|
| Busy | `"£45"` | `"£35"` |
| Baby | `"£50"` | `"£35"` |
| Bougie | `"£80"` | `"£35"` |
| Base | `"£35"` | `"£35"` (no change) |
| Budget | `"£20"` | `"£35"` |
| Bespoke | `"Quote"` | `"Quote"` (no change) |

**Commit:** `fix: correct all butler prices to £35/hr per founder directive`

### Task 1.3: Update butler-tasks.ts with Faridah's full taxonomy

Replace with full taxonomy from `docs/butler-options-and-tasks.md`.
- Remove `import type { ButlerTypeKey } from './pricing-config'` — define locally
- Busy: 8 tasks, Baby: 8, Bougie: 7, Base: 7, Budget: 7, Bespoke: empty

```typescript
export type ButlerTypeKey = 'busy' | 'baby' | 'bougie' | 'base' | 'budget' | 'bespoke';

export interface ButlerTask {
  id: string;
  label: string;
}

export const BUTLER_TASKS: Record<ButlerTypeKey, ButlerTask[]> = {
  busy: [
    { id: 'courier', label: 'Courier and package services' },
    { id: 'errands', label: 'Household errands, maintenance, decoration, organisation' },
    { id: 'personal', label: 'Personal, confidential or sensitive errands' },
    { id: 'stand-in', label: 'Stand in, proxy attendance' },
    { id: 'cross-country', label: 'Cross country errands' },
    { id: 'procurement', label: 'Procurement services' },
    { id: 'gifting', label: 'Corporate and personal gifting' },
    { id: 'other', label: 'Other' },
  ],
  baby: [
    { id: 'school-runs', label: 'School runs' },
    { id: 'recital-recording', label: 'School play and recital recording' },
    { id: 'babysitting', label: 'Baby sitting' },
    { id: 'forgotten-items', label: 'Forgotten items runs to school' },
    { id: 'parent-respite', label: 'Parent respite' },
    { id: 'activity-planning', label: 'Kids activity planning' },
    { id: 'welfare-checks', label: 'Welfare checks on elderly' },
    { id: 'other', label: 'Other' },
  ],
  bougie: [
    { id: 'rare-sourcing', label: 'Sourcing rare or high value items' },
    { id: 'gift-packages', label: 'Personalised gift packages' },
    { id: 'special-order', label: 'Special order involving travel' },
    { id: 'luxury-lifestyle', label: 'Luxury lifestyle' },
    { id: 'holiday-planning', label: 'Luxury holiday planning' },
    { id: 'event-organising', label: 'Luxury event organising' },
    { id: 'other', label: 'Other' },
  ],
  base: [
    { id: 'house-waiting', label: 'House waiting' },
    { id: 'property-management', label: 'Vacant property management and maintenance' },
    { id: 'key-holding', label: 'Key holding, mail sorting, delivery acceptance, plant watering' },
    { id: 'pickups', label: 'Pick ups and drop offs, forgotten items' },
    { id: 'wait-staff', label: 'Wait staff during dinner parties' },
    { id: 'grocery-delivery', label: 'Grocery delivery and set up' },
    { id: 'other', label: 'Other' },
  ],
  budget: [
    { id: 'errands', label: 'General errands and household tasks' },
    { id: 'grocery', label: 'Grocery shopping and delivery' },
    { id: 'plant-care', label: 'Plant watering and home checks' },
    { id: 'returns', label: 'Returns, exchanges, and drop-offs' },
    { id: 'mail-packages', label: 'Mail sorting and package collection' },
    { id: 'non-urgent-shopping', label: 'Non-urgent shopping' },
    { id: 'other', label: 'Other' },
  ],
  bespoke: [],
};
```

**Commit:** `feat: update all butler tasks to Faridah's complete taxonomy`

### Task 1.4: Update butler-page-configs.ts SEO prices

Update SEO descriptions referencing old prices → `"From £35/hr"`.

**Commit:** `fix: update SEO descriptions to £35/hr pricing`

---

## Phase 2: Supabase Setup

### Task 2.1: Create Supabase clients (browser + server)

**Files:**
- Create: `src/lib/supabase/client.ts` (browser client using `createBrowserClient`)
- Create: `src/lib/supabase/server.ts` (server client using `createServerClient` + `cookies()`)
- Create: `.env.local`

**`src/lib/supabase/client.ts`:**
```typescript
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**`src/lib/supabase/server.ts`:**
```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}
```

**`.env.local`:**
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
RESEND_API_KEY=your-resend-api-key
```

**Commit:** `feat: add Supabase browser and server clients`

### Task 2.2: Supabase Console Setup (manual)

Same SQL as original plan — `profiles` table, `bookings` table, RLS policies, auto-profile trigger. No code changes.

```sql
-- Profiles (auto-created on signup via trigger)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Bookings (guests + members)
CREATE TABLE bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  butler_type TEXT NOT NULL,
  service_option TEXT,
  day_option TEXT NOT NULL,
  specific_date DATE,
  time_slot TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  notes TEXT,
  reference TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Anyone can insert bookings" ON bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Users read own bookings" ON bookings FOR SELECT USING (auth.uid() = user_id);

-- Auto-profile trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (new.id, new.raw_user_meta_data->>'name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

Also: Enable email/password auth in Authentication → Providers.

---

## Phase 3: Auth Foundation

### Task 3.1: Create AuthContext

**Files:**
- Create: `src/context/AuthContext.tsx` (`'use client'`)
- Create: `src/context/__tests__/AuthContext.test.tsx`

Same implementation as original plan but uses `createBrowserClient` from `@/lib/supabase/client` instead of a single Supabase client. Provides `user`, `session`, `loading`, `signUp`, `signIn`, `signOut`.

```typescript
'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({
      email, password, options: { data: { name } },
    });
    return { error: error ? new Error(error.message) : null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? new Error(error.message) : null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
```

**Commit:** `feat: add AuthContext with Supabase auth integration`

### Task 3.2: Add AuthProvider to providers.tsx

Wrap children with `<AuthProvider>` in `src/components/providers.tsx`.

**Commit:** `feat: wire AuthProvider into app providers`

### Task 3.3: Create auth middleware

**Files:**
- Create: `middleware.ts` (project root)

Checks Supabase session via `@supabase/ssr`. Redirects unauthenticated users from `/members/dashboard` to `/members/login`. Matcher: `'/members/:path*'`.

This replaces the `ProtectedRoute` component — middleware runs server-side before rendering.

**Commit:** `feat: add Next.js middleware for auth route protection`

### Task 3.4: Create LoginPage

**Files:**
- Create: `src/app/members/login/page.tsx` (`'use client'`)

Dark theme, glass-morphism card, React Hook Form + Zod, `useAuth().signIn()`, `router.push('/members/dashboard')` on success, Sonner toast on error, `<Link href="/members/signup">`.

**Commit:** `feat: add member login page`

### Task 3.5: Create SignUpPage

**Files:**
- Create: `src/app/members/signup/page.tsx` (`'use client'`)

Fields: name, email, password, phone. `useAuth().signUp()`. Redirect to `/members/login` on success.

**Commit:** `feat: add member signup page`

### Task 3.6: Create MemberDashboard

**Files:**
- Create: `src/app/members/dashboard/page.tsx` (`'use client'`)

Protected by middleware. Shows user name/email, fetches bookings with TanStack Query, sign out button.

**Commit:** `feat: add member dashboard with booking history`

---

## Phase 4: Booking Flow Components

### Task 4.1: Create ServiceOptionSelector

**Files:**
- Create: `src/components/booking/ServiceOptionSelector.tsx` (`'use client'`)
- Create: `src/components/booking/__tests__/ServiceOptionSelector.test.tsx`

Same implementation as original plan. Glass-morphism cards with `motion.button`. Bespoke: textarea. Other: shows textarea for custom description.

**Commit:** `feat: add ServiceOptionSelector with full task taxonomy`

### Task 4.2: Create BookingForm

**Files:**
- Create: `src/components/booking/BookingForm.tsx` (`'use client'`)
- Create: `src/components/booking/__tests__/BookingForm.test.tsx`

Same implementation as original plan. React Hook Form + Zod, 3 day option cards, 3 time slot cards, shadcn Calendar for advance booking, contact fields (no postcode/address/duration).

Zod schema:
```typescript
z.object({
  dayOption: z.enum(['sameDay', 'nextDay', 'advance']),
  specificDate: z.date().optional(),
  timeSlot: z.enum(['morning', 'noon', 'evening']),
  name: z.string().min(1), email: z.string().email(),
  phone: z.string().min(10), notes: z.string().max(500).optional(),
}).refine(d => d.dayOption !== 'advance' || d.specificDate != null,
  { message: 'Please select a date', path: ['specificDate'] })
```

**Commit:** `feat: add BookingForm with 3-tier pricing and simplified fields`

### Task 4.3: Create BookingFlow

**Files:**
- Create: `src/components/booking/BookingFlow.tsx` (`'use client'`)
- Create: `src/components/booking/__tests__/BookingFlow.test.tsx`

Same 2-phase orchestrator. Key difference: `handleSubmit` calls `fetch('/api/bookings', { method: 'POST', body: ... })` (Route Handler) then `router.push('/booking-confirmation?ref=BT-XXXXX')`.

**Commit:** `feat: add BookingFlow 2-phase orchestrator`

---

## Phase 5: Booking Submission

### Task 5.1: Create booking API Route Handler

**Files:**
- Create: `src/app/api/bookings/route.ts`

This replaces both `send-booking.ts` and the Supabase Edge Function from the original plan.

The POST handler:
1. Parses and validates request body with Zod
2. Creates server Supabase client
3. Gets authenticated user (if any)
4. Generates reference (`BT-XXXXX`)
5. Inserts into bookings table
6. Sends email via Resend (non-blocking — logs warning if email fails, does not fail the booking)
7. Returns `{ reference, success: true }`

Uses `createClient()` from `@/lib/supabase/server` and `Resend` from `resend`. The Route Handler runs server-side so the Resend API key stays secret.

**Commit:** `feat: add booking API route with Supabase insert and Resend email`

---

## Phase 6: Pages & Routing

### Task 6.1: Migrate and simplify landing page

**Files:**
- Modify: `src/app/page.tsx`
- Migrate: `src/components/landing/Header.tsx` (`'use client'`)
- Migrate: `src/components/landing/Hero.tsx` (`'use client'`)
- Migrate: `src/components/landing/ButlerCategoryGrid.tsx`
- Migrate: `src/components/landing/Footer.tsx` (Server Component — no state/effects)

**Migration changes per component:**

**Header.tsx:**
- `'use client'` (uses useState, useEffect for scroll)
- `Link` from `next/link`, `href=` instead of `to=`
- `useAuth()` for auth-aware nav (login/join vs dashboard)
- `<Image>` from `next/image` for logos

**Hero.tsx:**
- `'use client'` (useState for segmented control)
- `useRouter()` from `next/navigation` for Members click → `/members/login`
- Subtitle: `"Across England. From £35/hr."`

**ButlerCategoryGrid.tsx:**
- Remove `onCategorySelect` prop
- `Link` from `next/link`, `href=` instead of `to=`

**Footer.tsx:**
- Server Component (pure markup)
- `Link` from `next/link`
- Remove "Company" column, update `© 2026`, add `hello@butlersinc.co.uk`

**Landing page (`page.tsx`):** Just Header + Hero + ButlerCategoryGrid + Footer. ~15 lines.

**Commit:** `feat: migrate and simplify landing page for Next.js`

### Task 6.2: Create dynamic butler page with SSG

**Files:**
- Create: `src/app/butlers/[id]/page.tsx`

**Key Next.js features:**
- `generateStaticParams()` → returns all 6 butler IDs for static generation at build time
- `generateMetadata()` → returns per-butler SEO title, description, keywords from `butler-page-configs.ts`
- JSON-LD structured data rendered as a `<script>` tag using the `generateButlerJsonLd()` function from `butler-page-configs.ts`. The JSON-LD content comes entirely from our own static data files (safe, no user input).
- Renders compact dark hero + `<BookingFlow butlerType={id} />` (client component)
- Invalid ID → `notFound()`

**Commit:** `feat: add dynamic butler page with SSG and SEO metadata`

### Task 6.3: Create butlers hub page

**Files:**
- Create: `src/app/butlers/page.tsx`

Server Component. Static content with metadata export. Lists all 6 butler types with links. Replaces old `ButlersPage.tsx`.

**Commit:** `feat: add butlers hub page`

### Task 6.4: Configure redirects in next.config.ts

Add `/reserve/busy` → `/butlers/busy` permanent redirect in `next.config.ts` `redirects()`.

**Commit:** `feat: add legacy URL redirect in Next.js config`

---

## Phase 7: Booking Confirmation

### Task 7.1: Create booking confirmation page

**Files:**
- Create: `src/app/booking-confirmation/page.tsx` (`'use client'`)

Reads `?ref=BT-XXXXX` from `useSearchParams()`. Displays reference, butler type, service, day option price label, "within 30 minutes" promise, `bookings@butlersinc.co.uk`. Shows "View your bookings" link for authenticated users.

**Commit:** `feat: add booking confirmation page`

---

## Phase 8: Cleanup & Verification

### Task 8.1: Remove old files

Delete any remaining files from the Vite project that weren't cleaned during scaffold:
- Old reservation components (`ButlerReservationLayout.tsx`, `PriceCalculator.tsx`, etc.)
- Old static butler pages if any remain
- Unused data files (`pricing-config.ts` if not referenced)

**Commit:** `chore: remove legacy Vite project files`

### Task 8.2: Full build and test

```bash
npm run build && npx vitest run
```
Expected: Zero TypeScript errors, all tests green, successful Next.js build.

### Task 8.3: Manual verification checklist

1. `npm run dev` → landing: Header + Hero + ButlerCategoryGrid + Footer only
2. Hero shows "Across England. From £35/hr."
3. All 6 butler boxes show "From £35" (Bespoke: "Quote")
4. Click "Busy Butler" → `/butlers/busy` with dark page, SEO metadata in page source
5. JSON-LD structured data visible in View Source (not just runtime)
6. Shows all 8 Busy Butler tasks
7. Click task → form appears (3rd click = form visible)
8. Form has 3 day cards (£70/£55/£35), 3 time cards, contact fields
9. "72+ Hours Notice" → date picker
10. Submit → `/booking-confirmation?ref=BT-XXXXX`
11. `/butlers/bespoke` → textarea (not cards)
12. "Members" on Hero → `/members/login`
13. `/members/dashboard` redirects to login when unauthenticated (via middleware)
14. `/reserve/busy` → 301 redirect to `/butlers/busy`
15. Mobile responsive
16. `next/font` loads Cormorant Garamond and Inter (check Network tab)
17. Images optimized via `next/image` (check WebP in Network tab)

### Task 8.4: Deploy to Vercel

```bash
npx vercel
```

Set environment variables in Vercel dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`

---

## Architecture Comparison: What Changed

| Aspect | Old (React+Vite) | New (Next.js) |
|--------|------------------|---------------|
| Routing | React Router 6 (client-side) | App Router (file-based, SSR/SSG) |
| SEO | `useEffect` + `document.title` | `generateMetadata()` + `metadata` export |
| JSON-LD | Runtime script injection | Server-rendered in page |
| Fonts | `@import` in CSS | `next/font/google` (self-hosted, no FOUT) |
| Images | `<img>` | `next/image` (auto WebP, lazy load) |
| Auth protection | `<ProtectedRoute>` (client) | `middleware.ts` (server, runs before render) |
| Booking API | Supabase Edge Function | Next.js Route Handler (`/api/bookings`) |
| Supabase client | Single client | Browser + Server clients (`@supabase/ssr`) |
| Hosting | Cloudflare Pages | Vercel |
| Env vars | `VITE_*` | `NEXT_PUBLIC_*` |
| Build | Vite 5 + SWC | Next.js + Turbopack |

---

## Key Reusable Assets

| Asset | Location | Used In |
|-------|----------|---------|
| shadcn Calendar | `src/components/ui/calendar.tsx` | BookingForm date picker |
| Glass-morphism | `bg-primary-foreground/5 border border-primary-foreground/10 backdrop-blur` | All booking cards |
| Design tokens | `src/app/globals.css` (charcoal, brass, cream, optical-white, sage) | All pages |
| Butler configs | `src/data/butler-page-configs.ts` | `generateMetadata()`, hero, JSON-LD |
| `cn()` utility | `src/lib/utils.ts` | All components |
| Sonner toast | via `src/components/providers.tsx` | Login/Signup error feedback |

---

## Potential Challenges

1. **Tailwind 4**: `create-next-app@latest` may ship Tailwind 4 (CSS-based config). If so, adapt theme customizations to `@theme` blocks in `globals.css`. Check shadcn compatibility.
2. **React 19**: Next.js latest ships React 19. Verify Framer Motion, Radix, TanStack Query compatibility. Pin React 18 if issues arise.
3. **next/image sizing**: Hero/butler images using `object-cover` with absolute positioning → use `<Image fill className="object-cover" />`.
4. **Framer Motion + Server Components**: Any component using `motion.*` or `AnimatePresence` must be `'use client'`.

---

## Pending Decisions (For Faridah)

1. **Bougie Butler name:** Bougie vs. Billionaire vs. Beau Monde
2. **Budget Butler "super power skills":** Needs clarification
3. **Member tiers:** Virtual Butler vs Personal Butler — deferred to Phase 2
4. **"First 2 hours free":** Deferred to Phase 2

---

## Files Summary

**CREATE: ~20 files**
- `src/components/providers.tsx`
- `src/app/globals.css` (overwrite with design tokens)
- `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/not-found.tsx`
- `src/app/butlers/page.tsx`, `src/app/butlers/[id]/page.tsx`
- `src/app/booking-confirmation/page.tsx`
- `src/app/members/login/page.tsx`, `signup/page.tsx`, `dashboard/page.tsx`
- `src/app/api/bookings/route.ts`
- `src/components/landing/` (4 migrated components)
- `src/components/booking/ServiceOptionSelector.tsx`, `BookingForm.tsx`, `BookingFlow.tsx`
- `src/context/AuthContext.tsx`
- `src/lib/supabase/client.ts`, `server.ts`
- `src/data/booking-config.ts`
- `middleware.ts`
- `vitest.config.ts`, `src/test/setup.ts`, `src/test/test-utils.tsx`
- Test files (~10)

**MIGRATE: 4 landing components** (Header, Hero, ButlerCategoryGrid, Footer)
**COPY: Data files** (services.ts, butler-tasks.ts, butler-page-configs.ts)
**DELETE: Entire old Vite project** (replaced by scaffold)
