# Ohmybutler | Premium Personal Butler Service

Your personal butler, on demand. Trusted assistants for urgent tasks, childcare logistics, luxury sourcing and home waiting across England.

## About

Ohmybutler is a premium personal concierge service website built with modern web technologies. The landing page showcases six distinct butler services with an elegant, luxury-focused design.

### Services

- **Busy Butler** – Same-day professional logistics and confidential tasks
- **Baby Butler** – Child logistics with optional body-cam for peace of mind  
- **Bougie Butler** – Exclusive access to high-end goods and experiences
- **Base Butler** – Property checks, key holding, and tradesman coordination
- **Budget Butler** – Best rates with route-optimised flexible timing
- **Bespoke Butler** – Custom tasks tailored to your specific needs

### Features

- Interactive tabbed service details
- Membership tiers (Light, Standard, Premium) or Pay As You Go pricing
- Trust & safety information with vetting process details
- Mobile-first responsive design
- Premium visual aesthetics following Apple/Google design principles

## Tech Stack

- **[Vite](https://vitejs.dev/)** – Fast build tool and dev server
- **[React 18](https://react.dev/)** – UI library
- **[TypeScript](https://www.typescriptlang.org/)** – Type-safe JavaScript
- **[Tailwind CSS](https://tailwindcss.com/)** – Utility-first CSS framework
- **[shadcn/ui](https://ui.shadcn.com/)** – High-quality React components
- **[Radix UI](https://www.radix-ui.com/)** – Accessible component primitives
- **[React Router](https://reactrouter.com/)** – Client-side routing
- **[Playwright](https://playwright.dev/)** – End-to-end testing

## Getting Started

### Prerequisites

- Node.js 18+ (recommended: install via [nvm](https://github.com/nvm-sh/nvm))
- npm or bun

### Installation

```sh
# Clone the repository
git clone <YOUR_GIT_URL>
cd Ohmybutler-premium-concierge

# Install dependencies
npm install
# or
bun install

# Start the development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm run build:dev` | Build with development mode |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |

## Project Structure

```
src/
├── components/
│   ├── landing/          # Landing page sections
│   │   ├── Header.tsx
│   │   ├── Hero.tsx
│   │   ├── ServiceSelector.tsx
│   │   ├── ServiceDetails.tsx
│   │   ├── HowItWorks.tsx
│   │   ├── Membership.tsx
│   │   ├── TrustSafety.tsx
│   │   ├── Testimonials.tsx
│   │   ├── FAQ.tsx
│   │   └── Footer.tsx
│   └── ui/               # Reusable UI components (shadcn)
├── pages/
│   ├── Index.tsx         # Main landing page
│   └── NotFound.tsx      # 404 page
├── hooks/                # Custom React hooks
├── lib/                  # Utility functions
└── index.css             # Global styles & design tokens
```

## Testing

End-to-end tests are configured with Playwright:

```sh
# Run tests
npx playwright test

# Run tests with UI
npx playwright test --ui
```

## Deployment

Build the production bundle:

```sh
npm run build
```

The output will be in the `dist/` directory, ready for deployment to any static hosting service.

## License

Private project. All rights reserved.
