# Butlers Inc. | Premium Personal Concierge Service

> Your personal butler, on demand. Trusted assistants for urgent tasks, childcare logistics, luxury sourcing and home waiting across England.

[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=flat&logo=vite)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38BDF8?style=flat&logo=tailwind-css)](https://tailwindcss.com/)

## 📋 Table of Contents

- [About Butlers Inc.](#about-butler-inc)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Design System](#design-system)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Data Architecture](#data-architecture)
- [Component Architecture](#component-architecture)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Deployment](#deployment)
- [Brand Assets](#brand-assets)
- [Contributing](#contributing)

## About Butlers Inc.

**Butlers Inc.** is a premium personal concierge platform designed for discerning professionals, families, and executives across England who value their time and demand exceptional service. We provide vetted, trusted personal assistants who handle everything from urgent logistics to luxury sourcing, all delivered with the discretion and reliability of a traditional British butler.

### Target Market

- **Busy Professionals**: C-suite executives, entrepreneurs, and professionals who need reliable logistics support
- **Families**: Parents requiring trusted childcare logistics, school runs, and family support
- **High-Net-Worth Individuals**: Clients seeking exclusive access to luxury goods, experiences, and bespoke services
- **Property Owners**: Homeowners and landlords requiring property management and tradesman coordination

### Business Model

Butlers Inc. operates on a flexible pricing structure:

- **Pay As You Go**: On-demand service for occasional needs
- **Membership Tiers**: Three subscription levels (Light, Standard, Premium) offering credits, discounts, and priority access
- **AI-Optimized Pricing**: Route optimization and demand-based pricing for maximum efficiency

## Key Features

### Six Specialized Butler Services

1. **Busy Butler** – Same-day professional logistics and urgent tasks (from £45)
   - Emergency document delivery and pickup
   - Time-sensitive professional errands
   - Same-day hand delivery service

2. **Baby Butler** – Child logistics with optional body-cam for peace of mind (from £50)
   - School pick-ups and drop-offs
   - Supervised care between activities
   - Elderly relative welfare checks
   - **Optional body-cam feature** for complete transparency

3. **Bougie Butler** – Luxury sourcing and exclusive experiences (from £80)
   - Rare goods procurement (hard-to-find items, limited editions)
   - Bespoke travel and experience planning
   - VIP reservations and exclusive event access

4. **Base Butler** – Property management and home waiting (from £35)
   - Tradesman coordination and key holding
   - Waiting for deliveries and installations
   - Property preparation and maintenance oversight
   - **Optional body-cam** for property security

5. **Budget Butler** – Flexible timing, best rates (from £20)
   - Route-optimized errands with flexible deadlines
   - Weekly grocery shopping and house stocking
   - Non-urgent tasks bundled for efficiency

6. **Bespoke Butler** – Fully custom requests (quoted individually)
   - Multi-vendor event coordination
   - Complex project management
   - Tailored solutions for unique needs

### Platform Features

- ✅ **Interactive Service Quiz** – AI-guided service selection
- ✅ **Membership System** – Tiered subscriptions (Light, Standard, Premium)
- ✅ **Trust & Safety** – Comprehensive vetting process documentation
- ✅ **Mobile-First Design** – Optimized for iOS and Android
- ✅ **Premium Aesthetics** – Luxury design language with Antique Brass accents
- ✅ **Body-Cam Transparency** – Optional recording for sensitive services

## Tech Stack

### Core Framework
- **[Vite 5.4](https://vitejs.dev/)** – Lightning-fast build tool and dev server with HMR
- **[React 18.3](https://react.dev/)** – Modern UI library with concurrent rendering
- **[TypeScript 5.8](https://www.typescriptlang.org/)** – Type-safe JavaScript for robust development
- **[React Router 6.30](https://reactrouter.com/)** – Client-side routing

### Styling & UI
- **[Tailwind CSS 3.4](https://tailwindcss.com/)** – Utility-first CSS framework
- **[shadcn/ui](https://ui.shadcn.com/)** – High-quality, accessible React components (49 components)
- **[Radix UI](https://www.radix-ui.com/)** – Unstyled, accessible component primitives
- **[Lucide React](https://lucide.dev/)** – Beautiful, consistent icon library
- **[tailwindcss-animate](https://www.npmjs.com/package/tailwindcss-animate)** – Animation utilities

### Form & Data Management
- **[React Hook Form 7.61](https://react-hook-form.com/)** – Performant form management
- **[Zod 3.25](https://zod.dev/)** – TypeScript-first schema validation
- **[TanStack Query 5.83](https://tanstack.com/query/)** – Powerful async state management

### Development Tools
- **[ESLint 9.32](https://eslint.org/)** – Code linting with TypeScript support
- **[Playwright 1.57](https://playwright.dev/)** – End-to-end testing framework
- **[SWC](https://swc.rs/)** – Fast TypeScript/JSX compilation via Vite plugin

## Design System

Butlers Inc. implements a **"Hybrid Enterprise"** design philosophy, blending the elegance of Apple's Human Interface Guidelines with the functionality of Google's Material Design 3 and the clarity of Monday.com's interfaces.

### Color Palette

Our design centers on **Antique Brass** – a matte, sophisticated accent that conveys understated luxury and timeless quality.

#### Primary Colors (Light Mode)
```css
--brass: 30 45% 48%           /* Antique Brass - primary accent */
--brass-muted: 30 30% 62%     /* Muted brass for subtle elements */
--cream: 40 33% 98%           /* Background - warm, premium white */
--charcoal: 220 20% 18%       /* Text - deep, readable gray */
--optical-white: 0 0% 99%     /* Radical transparency indicator */
```

#### Semantic Colors
```css
--sage: 145 25% 45%           /* Trust indicators */
--sage-light: 145 30% 92%     /* Success backgrounds */
--warm-gray: 30 8% 60%        /* Secondary text */
```

All colors are defined as HSL values in `src/index.css` and consumed via Tailwind's color system.

### Typography

- **Headings (h1–h6)**: [Cormorant Garamond](https://fonts.google.com/specimen/Cormorant+Garamond) – Classic serif for premium brand authority
- **Body Text**: [Inter](https://fonts.google.com/specimen/Inter) – Clean, readable sans-serif for functional content
- **Font Loading**: Google Fonts with `display=swap` for optimal performance

### Spacing & Layout

- **Responsive Section Padding**: Automatically adjusts with viewport size and respects safe area insets
  ```css
  .section-padding {
    py-24 md:py-32 lg:py-40
    /* Plus dynamic horizontal padding with safe-area-inset support */
  }
  ```
- **Container Logic**: `container-narrow` class provides max-width of 1280px with centered alignment
- **Border Radius**: Consistent `0.5rem` radius across all interactive elements

### Animations

- **fade-up**: 0.6s entrance animation with Y-axis translation
- **fade-in**: 0.5s opacity transition
- **accordion-down/up**: Radix UI native animations for collapsible content

All animations use `ease-out` timing functions for natural, premium feel.

## Getting Started

### Prerequisites

- **Node.js 18+** (Recommended: install via [nvm](https://github.com/nvm-sh/nvm))
- **npm** or **bun** package manager
- **Git** for version control

### Installation

```bash
# Clone the repository
git clone <YOUR_GIT_URL>
cd butler-inc-concierge

# Install dependencies
npm install
# or if using bun
bun install

# Start the development server
npm run dev
```

The application will be available at **`http://localhost:5173`** with hot module replacement (HMR) enabled.

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with HMR on port 5173 |
| `npm run build` | Build optimized production bundle to `dist/` |
| `npm run build:dev` | Build with development mode (unminified, source maps) |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint on all TypeScript/TSX files |

### Environment Setup (Optional)

Create a `.env` file in the project root if you need to override default configurations:

```env
# Example environment variables (currently none required)
# VITE_API_URL=https://api.butlerinc.com
```

## Project Structure

```
butler-inc-concierge/
├── public/
│   ├── images/
│   │   └── butlers-inc-logo.webp         # Primary logo
│   └── favicon.png                        # Bowler hat monogram (309KB)
│
├── src/
│   ├── components/
│   │   ├── landing/                       # 🎯 13 Landing Page Components
│   │   │   ├── Header.tsx                 # Navigation header with logo
│   │   │   ├── Hero.tsx                   # Hero section with CTA
│   │   │   ├── ServiceSelector.tsx        # Service category navigation
│   │   │   ├── ServiceDetails.tsx         # Tabbed service information
│   │   │   ├── HowItWorks.tsx             # Process explanation
│   │   │   ├── Membership.tsx             # Tier comparison cards
│   │   │   ├── TrustSafety.tsx            # Vetting process details
│   │   │   ├── Testimonials.tsx           # Customer reviews
│   │   │   ├── FAQ.tsx                    # Accordion-based FAQs
│   │   │   ├── Footer.tsx                 # Footer links and branding
│   │   │   ├── Quiz.tsx                   # AI service selection quiz
│   │   │   ├── GenieButton.tsx            # Floating AI assistant CTA
│   │   │   └── StickyBookingBar.tsx       # Mobile booking bar
│   │   │
│   │   ├── ui/                            # 🎨 49 shadcn/ui Components
│   │   │   ├── button.tsx                 # Button variants
│   │   │   ├── card.tsx                   # Card layouts
│   │   │   ├── tabs.tsx                   # Tab navigation
│   │   │   ├── accordion.tsx              # Collapsible sections
│   │   │   ├── dialog.tsx                 # Modal dialogs
│   │   │   └── ...                        # + 44 more components
│   │   │
│   │   └── NavLink.tsx                    # Shared navigation link component
│   │
│   ├── data/                              # ⭐ Centralized Data Layer
│   │   ├── services.ts                    # Service definitions + ServiceId type
│   │   └── membership-tiers.ts            # Membership tier data + TierName type
│   │
│   ├── pages/
│   │   ├── Index.tsx                      # Main landing page (composes all sections)
│   │   └── NotFound.tsx                   # 404 error page
│   │
│   ├── hooks/                             # Custom React Hooks
│   │   └── use-mobile.tsx                 # Responsive breakpoint hook
│   │
│   ├── lib/
│   │   └── utils.ts                       # Utility functions (cn helper, etc.)
│   │
│   ├── App.tsx                            # Root component with React Router
│   ├── main.tsx                           # Application entry point
│   ├── index.css                          # Global styles + design tokens
│   └── vite-env.d.ts                      # Vite type declarations
│
├── tests/
│   └── example.spec.ts                    # Playwright E2E tests
│
├── components.json                        # shadcn/ui configuration
├── tailwind.config.ts                     # Tailwind configuration + theme
├── vite.config.ts                         # Vite build configuration
├── tsconfig.json                          # TypeScript configuration
├── playwright.config.ts                   # Playwright test configuration
└── package.json                           # Dependencies and scripts
```

### Key Directory Explanations

- **`src/components/landing/`**: All landing page sections as isolated, reusable components. Each component is self-contained and follows the single-responsibility principle.

- **`src/components/ui/`**: shadcn/ui component library. These are copy-pasted into the project (not installed as npm packages) for maximum customization flexibility.

- **`src/data/`**: **NEW** centralized data layer. Previously, service and membership data was scattered across components. This architecture improvement provides:
  - Single source of truth for business data
  - Type-safe data consumption via exported TypeScript types
  - Easier data updates without touching component logic

## Data Architecture

### Centralized Data Layer

Butlers Inc. implements a **single source of truth** pattern for business data, extracted into `src/data/`:

#### `src/data/services.ts`

Defines all six butler services with complete metadata:

```typescript
export type ServiceId = "busy" | "baby" | "bougie" | "base" | "budget" | "bespoke";

export interface Service {
  id: ServiceId;
  name: string;
  shortName: string;
  subtitle: string;
  type: string;
  bodycam?: boolean;
  image: string;
  examples: string[];
  priceFrom: string;
}

export const services: Service[] = [
  {
    id: "busy",
    name: "Busy Butler",
    shortName: "Busy",
    subtitle: "Urgent professional logistics",
    // ... full service definition
  },
  // ... 5 more services
];
```

**Consumed by**: `ServiceDetails.tsx`, `ServiceSelector.tsx`, `Quiz.tsx`

#### `src/data/membership-tiers.ts`

Defines membership tier structure:

```typescript
export type TierName = "Light" | "Standard" | "Premium";

export interface MembershipTier {
  name: TierName;
  credits: number;
  discount: string;
  genieAllowance: string;
}

export const membershipTiers: MembershipTier[] = [
  { name: "Light", credits: 3, discount: "10% off", genieAllowance: "1/year" },
  // ... Standard, Premium
];
```

**Consumed by**: `Membership.tsx`

### Benefits of This Architecture

1. **Type Safety**: TypeScript types exported alongside data ensure compile-time checks
2. **Maintainability**: Update service pricing or details in one location
3. **Testability**: Data can be mocked or tested independently of components
4. **Scalability**: Easy to extend with CMS integration or API data fetching

## Component Architecture

### Landing Page Composition

The main landing page (`src/pages/Index.tsx`) composes all sections in a structured flow:

```tsx
<div className="flex min-h-screen flex-col">
  <Header />
  <main className="flex-1">
    <Hero />
    <ServiceSelector />
    <ServiceDetails />
    <HowItWorks />
    <Membership />
    <TrustSafety />
    <Testimonials />
    <FAQ />
  </main>
  <Footer />
  <GenieButton />
  <StickyBookingBar />
</div>
```

### Data Flow Pattern

```
src/data/services.ts
  ↓ (import)
src/components/landing/ServiceDetails.tsx
  ↓ (renders)
Tabbed UI with service examples and pricing
```

**Example Implementation:**

```tsx
import { services, type ServiceId } from "@/data/services";

export function ServiceDetails() {
  return (
    <Tabs defaultValue="busy">
      {services.map((service) => (
        <TabsContent key={service.id} value={service.id}>
          <h3>{service.name}</h3>
          <p>{service.subtitle}</p>
          <ul>
            {service.examples.map((example) => (
              <li key={example}>{example}</li>
            ))}
          </ul>
        </TabsContent>
      ))}
    </Tabs>
  );
}
```

### shadcn/ui Integration

All UI components are sourced from [shadcn/ui](https://ui.shadcn.com/) and customized to match the Butlers Inc. design system:

1. Components are **copied** into `src/components/ui/` (not installed via npm)
2. Each component extends Radix UI primitives with Tailwind styling
3. Design tokens from `src/index.css` are automatically applied via Tailwind
4. Components support dark mode via `next-themes` (though currently light mode is primary)

**Adding New Components:**

```bash
# Use shadcn CLI to add components
npx shadcn@latest add <component-name>

# Example: Add a new dialog component
npx shadcn@latest add dialog
```

## Development Workflow

### Recommended IDE Setup

- **VS Code** with extensions:
  - [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
  - [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss)
  - [TypeScript Vue Plugin (Volar)](https://marketplace.visualstudio.com/items?itemName=Vue.vscode-typescript-vue-plugin)
  - [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

### Code Organization Best Practices

1. **Component Naming**: Use PascalCase for component files (`ServiceDetails.tsx`)
2. **Data Files**: Use kebab-case for data modules (`membership-tiers.ts`)
3. **Type Exports**: Always export types alongside data for reusability
4. **CSS Custom Properties**: Define new design tokens in `src/index.css` under `:root`

### Using Design Tokens

**✅ Correct – Use Tailwind classes:**
```tsx
<button className="bg-brass text-cream hover:bg-brass-muted">
  Book Now
</button>
```

**❌ Incorrect – Avoid hardcoded colors:**
```tsx
<button style={{ backgroundColor: '#8B7355' }}>Book Now</button>
```

### Creating New Landing Sections

1. Create component in `src/components/landing/NewSection.tsx`
2. Import and add to `src/pages/Index.tsx`
3. Apply `.section-padding` utility for consistent spacing
4. Use design tokens (`brass`, `cream`, `charcoal`) for colors

## Testing

### End-to-End Testing with Playwright

Tests are located in `tests/example.spec.ts` and cover critical user flows:

```bash
# Run all tests headless
npx playwright test

# Run tests with UI browser
npx playwright test --ui

# Run tests in specific browser
npx playwright test --project=chromium

# Generate test report
npx playwright show-report
```

### Test Configuration

Playwright is configured in `playwright.config.ts`:
- **Base URL**: `http://localhost:5173`
- **Browsers**: Chromium, Firefox, WebKit
- **Retries**: 2 retries on CI, 0 locally
- **Timeout**: 30 seconds per test

### Writing New Tests

```typescript
import { test, expect } from '@playwright/test';

test('displays all six butler services', async ({ page }) => {
  await page.goto('/');
  
  const services = page.locator('[data-testid="service-card"]');
  await expect(services).toHaveCount(6);
});
```

## Deployment

### Building for Production

```bash
# Create optimized production build
npm run build

# Output: dist/ directory
# - Minified JavaScript bundles
# - Optimized CSS
# - Compressed assets
```

### Vercel Deployment (Recommended)

Butlers Inc. is currently deployed on **[Vercel](https://vercel.com/)**, optimized for static site hosting:

#### Initial Setup

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Link project to Vercel:
   ```bash
   vercel link
   ```

3. Deploy to production:
   ```bash
   vercel --prod
   ```

#### Automatic Deployments

Every push to `main` branch triggers automatic production deployment via Vercel GitHub integration.

#### Vercel Configuration

Create `vercel.json` in project root (if custom configuration needed):

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### Alternative Hosting Platforms

Butlers Inc. can be deployed to any static hosting service:

- **Netlify**: Drag-and-drop `dist/` folder or connect GitHub repo
- **Cloudflare Pages**: Push to GitHub, connect repo in Cloudflare dashboard
- **AWS S3 + CloudFront**: Upload `dist/` to S3 bucket, configure CloudFront distribution
- **GitHub Pages**: Use `gh-pages` package to deploy `dist/` folder

### Performance Optimization

The production build includes:
- ✅ Tree-shaking (removes unused code)
- ✅ Code splitting (lazy-loaded routes)
- ✅ CSS purging (Tailwind removes unused classes)
- ✅ Asset compression (Vite handles gzip/brotli)
- ✅ Image optimization (WebP format for logo)

**Expected Bundle Size:**
- Main JS bundle: ~150KB (gzipped)
- CSS: ~15KB (gzipped)
- First Contentful Paint: <1.5s on 4G

## Brand Assets

### Logos

- **Primary Logo**: `/public/images/butlers-inc-logo.webp` (transparent background)
- **Favicon**: `/public/favicon.png` (309KB, bowler hat monogram)
- **Apple Touch Icon**: Uses same favicon

### Usage Guidelines

- **Logo**: Use on light backgrounds only (cream, ivory, optical-white)
- **Minimum Size**: 120px width for legibility
- **Clear Space**: Maintain at least 16px padding around logo
- **Color Modifications**: Do not alter logo colors or apply filters

### Typography Licensing

- **Cormorant Garamond**: Free via Google Fonts (OFL license)
- **Inter**: Free via Google Fonts (OFL license)

## Contributing

### Code Style Guidelines

- **TypeScript**: Enable strict mode, avoid `any` types
- **React**: Use functional components with hooks (no class components)
- **Formatting**: Use Prettier defaults (2-space indentation, single quotes)
- **Naming Conventions**:
  - Components: PascalCase (`ServiceDetails.tsx`)
  - Utilities: camelCase (`use-mobile.tsx`)
  - Data files: kebab-case (`membership-tiers.ts`)

### Git Workflow

1. Create feature branch from `main`:
   ```bash
   git checkout -b feature/new-service-category
   ```

2. Make changes and commit with descriptive messages:
   ```bash
   git commit -m "feat: Add VIP Butler service tier"
   ```

3. Push branch and create pull request:
   ```bash
   git push origin feature/new-service-category
   ```

### Pull Request Guidelines

- ✅ Include screenshots for UI changes
- ✅ Write descriptive PR titles (`feat:`, `fix:`, `docs:`, `refactor:`)
- ✅ Ensure all tests pass (`npm run lint`, `npx playwright test`)
- ✅ Update README if adding new features

## License

**Private project. All rights reserved.**

For questions or support, contact: [your-email@butlerinc.com]

---

**Built with ❤️ by the Butlers Inc. team**
