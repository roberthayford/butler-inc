# Butlers Inc. Infrastructure Research Report

> Last updated: February 2026
> Prepared for: Butlers Inc. Premium Concierge Platform
> Perspective: Senior Web Developer & Project Manager

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current Tech Stack Analysis](#current-tech-stack-analysis)
3. [Frontend Hosting Comparison](#frontend-hosting-comparison)
4. [Database & Backend Comparison](#database--backend-comparison)
5. [Authentication Solutions](#authentication-solutions)
6. [Payment Processing](#payment-processing)
7. [Supporting Services](#supporting-services)
8. [Recommended Architecture](#recommended-architecture)
9. [Risk Assessment](#risk-assessment)
10. [Decision Matrix](#decision-matrix)

---

## Executive Summary

Butlers Inc. is a premium concierge marketplace built with **React 18 + Vite 5 + TypeScript**. The platform currently operates as a frontend-only SPA with no backend, database, or authentication. This report evaluates hosting, database, and service providers to take the platform from MVP to scale.

**Key Recommendation:** Deploy on **Cloudflare Pages** (free, unlimited bandwidth) with **Supabase Pro** ($25/mo) as the all-in-one backend. This combination provides database, authentication, realtime subscriptions, file storage, and edge functions for a total fixed cost of **~$6.50/mo at MVP** scaling to **~$690/mo at 50K users**.

---

## Current Tech Stack Analysis

### Framework & Build

| Component | Technology | Version |
|-----------|-----------|---------|
| Build tool | Vite | 5.4 |
| UI library | React | 18.3 |
| Language | TypeScript | 5.8 |
| Routing | React Router | 6.30 |
| Package manager | Bun | Latest |
| Dev server port | localhost | 8080 |

### UI & Styling

| Component | Technology | Version |
|-----------|-----------|---------|
| CSS framework | Tailwind CSS | 3.4 |
| Component library | shadcn/ui | 49+ components |
| Primitives | Radix UI | 26 components |
| Icons | Lucide React | 0.462 |
| Animations | Framer Motion | 12.29 |
| Carousel | Embla Carousel | 8.6 |
| Charts | Recharts | 2.15 |

### Data & Forms

| Component | Technology | Version |
|-----------|-----------|---------|
| Server state | TanStack React Query | 5.83 |
| Form management | React Hook Form | 7.61 |
| Validation | Zod | 3.25 |
| Date utilities | date-fns | 3.6 |

### Design System

- **Primary accent:** Antique Brass (HSL: 30 45% 48%)
- **Fonts:** Cormorant Garamond (headings) + Inter (body)
- **Dark mode:** CSS variable-based theme switching
- **Responsive:** Mobile-first with safe-area insets

### Testing

| Component | Technology |
|-----------|-----------|
| E2E testing | Playwright 1.57 |
| Linting | ESLint 9.32 + typescript-eslint 8.38 |
| Browser support | Chromium, Firefox, WebKit |

### What's Missing (Needs to Be Built)

- Backend API for booking persistence
- User authentication & authorization
- Database for all platform data
- Payment processing (Stripe integration)
- Email notifications (booking confirmations)
- SMS notifications (butler dispatch)
- File storage (profile photos, delivery evidence)
- Admin dashboard
- Butler availability & routing system
- Body-cam infrastructure

---

## Frontend Hosting Comparison

### Cloudflare Pages (RECOMMENDED)

**Pricing:**
- Free: Unlimited bandwidth, 500 builds/mo, 1 concurrent build
- Pro ($5/mo): 5,000 builds/mo, 5 concurrent builds + Workers
- Business ($20/mo): 20,000 builds/mo, 20 concurrent builds

**Strengths:**
- Unlimited bandwidth on ALL tiers including free
- 330+ global edge locations (largest CDN network)
- ~50ms average TTFB (fastest of all options)
- 477 Tbps DDoS protection network (industry-leading)
- Commercial use allowed on free tier
- Workers for future serverless API routes ($5/mo for 10M requests)
- R2 storage integration with zero egress fees
- Native GitHub CI/CD with preview deployments

**Weaknesses:**
- Preview deployment DX slightly less polished than Vercel
- Build configuration requires minor manual setup for Vite
- Limited to 500 builds/month on free tier (sufficient for a small team)

**Vite deployment config:**
```
Build command: npm run build
Output directory: dist
```

### Vercel

**Pricing:**
- Hobby (Free): Non-commercial only, 100 GB bandwidth, 6,000 build min
- Pro ($20/mo per seat): 1 TB bandwidth, commercial use allowed
- Enterprise: Custom pricing

**Strengths:**
- Best-in-class developer experience and GitHub integration
- Excellent preview deployment comments on PRs
- Built-in Web Analytics and Speed Insights
- Zero-config Vite/React deployment
- 119 edge locations across 51 countries

**Weaknesses:**
- Hobby tier explicitly prohibits commercial use (must pay $20/mo from day one)
- Bandwidth overages expensive ($20 per 100 GB)
- Smaller edge network than Cloudflare
- Designed for Next.js SSR -- overkill for a Vite SPA
- No formal SLA on Hobby/Pro tiers

**Verdict:** Excellent platform, but the $20/mo minimum for commercial use and SSR-oriented design make it a poor fit for a Vite SPA startup.

### Netlify

**Pricing:**
- Free: 100 GB bandwidth, 300 build min, 1 concurrent build
- Pro ($19/mo per member): 1 TB bandwidth, 25,000 build min

**Strengths:**
- Free tier allows commercial use
- Built-in form handling (useful for contact/inquiry forms)
- Good plugin ecosystem
- 100 GB free bandwidth sufficient for MVP

**Weaknesses:**
- Slowest average TTFB (~90ms) of top three options
- September 2025 switch to credit-based pricing introduced cost unpredictability
- Bandwidth overage is the most expensive ($55 per 100 GB)
- Build minutes on free tier (300 min) most restrictive

**Verdict:** Solid option, but slower performance and unpredictable new pricing model reduce confidence for a premium brand.

### AWS Amplify Hosting

**Pricing:** Pay-as-you-go
- Build: $0.01/min
- Data served: $0.15/GB
- Storage: $0.023/GB
- Free tier: 5 GB storage, 15 GB served, 1,000 build min (12 months)

**Strengths:**
- Largest CDN (CloudFront, 600+ PoPs)
- Pay exactly what you use
- Native AWS ecosystem integration
- 99.9% SLA (CloudFront)

**Weaknesses:**
- AWS console complexity
- Free tier expires after 12 months
- Cost per GB ($0.15) adds up faster than alternatives
- Less polished preview deployment experience

**Verdict:** Only consider if you're committed to the full AWS ecosystem. Otherwise, significantly more complex for marginal benefit.

### Render

**Pricing:**
- Free: 100 GB bandwidth, 500 build min
- Starter ($7/mo): 750 build min

**Strengths:**
- Simple DX, 100 GB free bandwidth
- Can host backend services on same platform

**Weaknesses:**
- No formal uptime SLA
- Limited CDN documentation
- Less mature frontend-specific workflows

### DigitalOcean App Platform

**Pricing:**
- Free: Up to 3 static apps, 1 GiB bandwidth
- Additional: $3/mo per app, $0.02/GiB overage

**Weakness:** 1 GiB free bandwidth is absurdly low. Not viable for any real application.

### Hosting Decision Matrix

| Criterion | Cloudflare Pages | Vercel | Netlify | AWS Amplify |
|-----------|:---:|:---:|:---:|:---:|
| Free commercial use | **Yes** | No | Yes | Yes (12 mo) |
| Unlimited bandwidth | **Yes** | No | No | No |
| Edge locations | **330+** | 119 | Multi | 600+ |
| Avg TTFB | **~50ms** | ~70ms | ~90ms | ~60ms |
| DDoS protection | **Best** | Good | Good | Good |
| Serverless functions | Workers | Functions | Functions | Lambda |
| Cost at MVP | **$0** | $20 | $0 | $0-2 |
| Cost at 100K users | **$0** | $20 | $0-19 | $8-15 |

**Winner: Cloudflare Pages** -- Unlimited free bandwidth, fastest CDN, best DDoS protection, commercial use allowed.

---

## Database & Backend Comparison

### Supabase (RECOMMENDED)

**What it is:** Backend-as-a-Service built on PostgreSQL. Includes auth, file storage, realtime subscriptions, edge functions, and Row Level Security.

**Pricing:**

| Tier | Cost | Database | Auth MAU | Storage | Realtime |
|------|-----:|----------|---------|---------|----------|
| Free | $0 | 500 MB | 50,000 | 1 GB | 200 connections, 2M messages |
| Pro | $25 | 8 GB | 100,000 | 100 GB | 500 connections, 5M messages |
| Team | $599 | 50 GB | 500,000 | 100 GB | 500 connections |

**Why it wins for Butlers Inc.:**

1. **Realtime is critical.** Butler availability, booking status tracking (requested -> confirmed -> in-progress -> complete), and live notifications all need WebSockets. Supabase provides this natively. Every alternative requires a separate Pusher ($29-49/mo) or Ably integration.

2. **Auth is bundled.** 50K MAU free, 100K on Pro. Using Neon + Clerk would cost $25 + $25 = $50/mo for the same functionality.

3. **Row Level Security** maps directly to the data model:
   - Users see only their own bookings
   - Butlers see only their assigned tasks
   - Admins see everything

4. **One SDK.** `@supabase/supabase-js` provides DB + Auth + Storage + Realtime in one import, integrating cleanly with TanStack Query.

5. **TypeScript integration.** Auto-generated types from your database schema feed directly into React components.

**Weaknesses:**
- Free tier pauses after 1 week of inactivity (not production-ready)
- Pro-to-Team jump ($25 to $599) is steep
- Vertical scaling only -- horizontal scaling still in progress
- Medium vendor lock-in (auth tokens, RLS policies, storage URLs are Supabase-specific)

**Lock-in mitigation:** Use Drizzle ORM or Prisma for data access instead of Supabase's PostgREST API. This keeps the SQL layer portable.

---

### Neon (Best Pure Database)

**What it is:** Serverless PostgreSQL, acquired by Databricks (May 2025). Database-only -- no auth, storage, or realtime.

**Pricing:**

| Tier | Cost | Compute | Storage | Branches |
|------|-----:|---------|---------|----------|
| Free | $0 | 100 CU-hrs/project | 0.5 GB | 10 |
| Launch | ~$15 (usage) | $0.106/CU-hr | $0.35/GB-mo | 10 |
| Scale | ~$70+ (usage) | $0.222/CU-hr | $0.35/GB-mo | 25 |

**Strengths:**
- True scale-to-zero (pay nothing when idle)
- Database branching for dev/staging (excellent for PR preview databases)
- Fast cold starts (~500ms-1s)
- Built-in connection pooling (PgBouncer, up to 10,000 connections)
- Full Postgres extensions support
- Low vendor lock-in (standard pg_dump/pg_restore)
- New Neon Auth (60K MAU free)

**Weaknesses:**
- No built-in realtime, file storage, or edge functions
- Must assemble additional services (auth, realtime, storage) separately
- Cold starts of 500ms-1s on first request after idle

**Best use case for Butlers Inc.:** Staging/branching database alongside Supabase production, or analytics/reporting database at scale.

---

### PlanetScale

**What it is:** Originally serverless MySQL on Vitess, now also offering PostgreSQL.

**Current status:** Removed free Hobby plan (April 2024), causing community backlash. Has since pivoted and added PostgreSQL. Pricing starts at $5/mo for single-node Postgres, $15/mo for HA.

**Verdict:** Turbulent pricing history and staff layoffs raise longevity concerns. Not recommended for a new project when Supabase and Neon offer more stability and better value.

---

### Railway

**What it is:** General-purpose cloud platform (modern Heroku) with one-click managed databases.

**Pricing:** Hobby $5/mo ($5 credits included), Pro $20/mo ($20 credits included). A light Postgres instance costs well under $1/mo.

**Strengths:** Simple DX, cheap for small databases, can host backend services too.

**Weaknesses:** No built-in backup system, no branching, no auth/realtime/storage, database does not scale to zero, reported data loss incidents.

**Verdict:** Good for hosting backend API servers alongside Supabase, but not recommended as the primary database.

---

### AWS Aurora Serverless v2

**What it is:** AWS managed PostgreSQL with serverless auto-scaling.

**Pricing:** ~$0.12/ACU-hr, minimum 0.5 ACU = ~$43/mo when active. Storage $0.10/GB-mo.

**Strengths:** Enterprise-grade, multi-AZ, automated backups, point-in-time recovery, scales to massive capacity.

**Weaknesses:** Minimum ~$43/mo (expensive for MVP), complex pricing, steep learning curve, cold starts from 0 ACU take 15-30+ seconds.

**Verdict:** Only appropriate at 100K+ users with a dedicated DevOps team. Overkill and overpriced for MVP through growth phases.

---

### Turso (Edge SQLite)

**What it is:** Distributed SQLite using libSQL with edge replication.

**Pricing:** Free (5 GB, 500M reads), Developer $4.99/mo, Scaler $24.92/mo.

**Strengths:** Edge replication for global low-latency reads, generous free tier, database-per-tenant architecture.

**Weaknesses:** SQLite (not PostgreSQL) -- smaller ecosystem, limited ORM support, not ideal for complex transactional marketplace workflows. High vendor lock-in (complete rewrite needed to migrate away).

**Verdict:** Interesting technology but wrong fit for a marketplace with complex relational data (bookings, payments, availability).

---

### Database Decision Matrix

| Criterion | Supabase | Neon | Railway | Aurora | Turso |
|-----------|:---:|:---:|:---:|:---:|:---:|
| All-in-one (DB+Auth+RT) | **Yes** | No | No | No | No |
| Realtime built-in | **Yes** | No | No | No | No |
| Best pure database | No | **Yes** | No | No | No |
| Scale-to-zero | No | **Yes** | No | Yes (slow) | N/A |
| Branching | Limited | **Yes** | No | No | No |
| MVP cost | **$0-25** | $0-15 | $5 | $43+ | $0 |
| Vendor lock-in | Medium | **Low** | **Low** | High | High |
| Best for Butlers Inc. | **Winner** | Runner-up | Neutral | Not yet | Not fit |

---

## Authentication Solutions

| Provider | Free MAU | Paid Price | Best For |
|----------|---------|-----------|---------|
| **Supabase Auth** | 50,000 | $0.003/MAU (bundled) | Best value when using Supabase |
| **Clerk** | 10,000 | $0.02/MAU + $25/mo Pro | Best DX, pre-built components |
| **Auth0** | 25,000 | ~$0.07/MAU + $35/mo | Enterprise features |
| **Firebase Auth** | 50,000 | $0.0055/MAU | Generous free, Google ecosystem |
| **Neon Auth** | 60,000 | Included on paid plans | New, good if using Neon |

**Recommendation:** Supabase Auth. Bundled with the database at no extra cost, integrates natively with RLS policies, realtime, and storage. No token-passing plumbing between services needed.

---

## Payment Processing

### Stripe Connect (RECOMMENDED)

Stripe Connect is the only viable option for a UK marketplace model:

- **Split payments:** Customer pays, Stripe splits between platform and butler
- **Butler onboarding:** KYC/AML compliance handled by Stripe
- **Tax reporting:** Automated 1099/tax forms
- **Dispute handling:** Built-in chargeback management

**Fees (UK):**
- Card transaction: 1.5% + 20p (UK cards)
- Connect Express: $2/active butler account/mo
- Payouts: 0.25% + 25p per payout to butler

Square lacks marketplace tooling. PayPal fees are higher with worse UX.

---

## Supporting Services

### Email: Resend (MVP) -> AWS SES (Scale)

- **MVP:** Resend free tier (3K/mo) with React Email for beautiful transactional emails
- **Scale:** AWS SES at $0.10/1K emails (10x cheaper than Resend at volume)
- **Migration trigger:** When email volume exceeds 50K/month

### SMS: Twilio

- UK outbound: $0.0463/SMS (~3.7p)
- Budget 2-4 SMS per booking (confirmation + reminder to customer and butler)
- **Cost optimization:** Implement web push notifications (free) for non-critical alerts, reserve SMS for confirmations and OTP only

### File Storage: Cloudflare R2

- Storage: $0.015/GB-mo
- **Egress: $0 (free)**
- Free tier: 10 GB
- Use for butler profile photos, delivery evidence images, documents
- Zero egress fees save hundreds/month vs AWS S3 at scale

### Analytics: PostHog + Google Analytics 4

- PostHog free tier: 1M events/mo + 5K session replays (90% of companies never exceed this)
- GA4: Free, unlimited
- Add Plausible ($9-14/mo) only if privacy is a core brand value

---

## Recommended Architecture

```
                    ┌──────────────────────────┐
                    │     Cloudflare DNS        │
                    │   + DDoS Protection       │
                    │   + SSL Termination       │
                    │   (Free, 477 Tbps)        │
                    └────────────┬─────────────┘
                                 │
                    ┌────────────▼─────────────┐
                    │   Cloudflare Pages        │
                    │   React + Vite SPA        │
                    │   (Free, unlimited BW)    │
                    └────────────┬─────────────┘
                                 │
           ┌─────────────────────┼─────────────────────┐
           │                     │                     │
┌──────────▼──────────┐ ┌───────▼────────┐ ┌──────────▼──────────┐
│   Supabase Auth     │ │   Supabase     │ │   Supabase          │
│   (50K MAU free)    │ │   PostgreSQL   │ │   Realtime          │
│                     │ │   (8 GB Pro)   │ │   (WebSockets)      │
│  - Email/password   │ │                │ │                     │
│  - Social logins    │ │  - Users       │ │  - Booking status   │
│  - Magic links      │ │  - Bookings    │ │  - Availability     │
│  - JWT tokens       │ │  - Payments    │ │  - Notifications    │
│  - RLS integration  │ │  - Butlers     │ │  - Live tracking    │
└─────────────────────┘ └───────┬────────┘ └─────────────────────┘
                                │
           ┌────────────────────┼────────────────────┐
           │                    │                    │
┌──────────▼──────────┐ ┌──────▼───────┐ ┌──────────▼──────────┐
│   Stripe Connect    │ │ Cloudflare   │ │   Resend / SES      │
│   (Payments)        │ │ R2 (Files)   │ │   (Email)           │
│                     │ │              │ │                     │
│  - Split payments   │ │  - Profiles  │ │  - Confirmations    │
│  - Butler payouts   │ │  - Evidence  │ │  - Reminders        │
│  - KYC/AML          │ │  - Documents │ │  - Receipts         │
└─────────────────────┘ └──────────────┘ └─────────────────────┘
           │
┌──────────▼──────────┐
│   Twilio (SMS)      │
│                     │
│  - Booking alerts   │
│  - OTP codes        │
│  - Butler dispatch  │
└─────────────────────┘
```

### Data Flow

1. **User books a butler** -> React form validated with Zod -> Supabase Edge Function -> creates booking record -> triggers Realtime update -> sends confirmation via Resend
2. **Butler accepts booking** -> Supabase Realtime -> updates booking status -> triggers SMS via Twilio -> updates customer UI in real-time
3. **Payment processed** -> Stripe Connect webhook -> Supabase Edge Function -> splits payment -> records transaction -> triggers payout to butler
4. **Booking completes** -> Butler uploads evidence photos to R2 -> booking marked complete -> review prompt sent via email

---

## Risk Assessment

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Supabase outage | Low | High | Use Drizzle ORM for portable data layer; maintain pg_dump backups |
| Supabase pricing increase | Medium | Medium | Data layer portability via ORM; can migrate to Neon + separate services |
| Cloudflare Pages build limits | Low | Low | 500 builds/mo is generous; upgrade to $5/mo if exceeded |
| Stripe Connect compliance changes | Low | High | Stay current with Stripe API versions; monitor regulatory updates |
| Realtime connection limits | Medium | Medium | Monitor concurrent connections; upgrade compute or implement connection pooling |

### Business Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| SMS costs spiral at scale | High | Medium | Implement push notifications early; SMS only for critical alerts |
| Supabase Pro-to-Team gap ($25->$599) | Medium | High | Optimize within Pro tier with compute add-ons ($10-40/mo each) before jumping to Team |
| Vendor lock-in to Supabase ecosystem | Medium | Medium | Use standard Postgres tools (Drizzle ORM); avoid deep PostgREST dependency |
| Data loss | Low | Critical | Enable Supabase daily backups (Pro); maintain separate pg_dump schedule |

### Operational Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Single developer bottleneck | High | High | Document infrastructure thoroughly; use IaC where possible |
| Security breach | Low | Critical | Supabase RLS policies; Stripe handles PCI compliance; regular security audits |
| GDPR compliance | Medium | High | Supabase EU region available; implement data deletion workflows; privacy policy |

---

## Decision Matrix

### Final Recommendations

| Layer | Choice | Monthly Cost | Rationale |
|-------|--------|-------------:|-----------|
| **Frontend Hosting** | Cloudflare Pages | $0 | Unlimited bandwidth, fastest CDN, free commercial use |
| **Backend + Database** | Supabase Pro | $25 | All-in-one: DB + Auth + Realtime + Storage + Edge Functions |
| **Payments** | Stripe Connect | Per-transaction | Only viable UK marketplace payment solution |
| **Email** | Resend -> AWS SES | $0-20 | Best DX at MVP, cheapest at scale |
| **SMS** | Twilio | Per-SMS | Best API/docs, reliable UK delivery |
| **File Storage** | Cloudflare R2 | $0-8 | Zero egress fees, massive cost savings at scale |
| **Analytics** | PostHog + GA4 | $0 | 1M events free, session replays included |
| **Domain + DNS** | Cloudflare | $1.50 | At-cost domain registration, free DNS/SSL |

### Alternatives Considered and Rejected

| Option | Reason for Rejection |
|--------|---------------------|
| Vercel | $20/mo minimum for commercial use; SPA doesn't benefit from SSR features |
| Neon as primary DB | Requires assembling auth + realtime + storage separately ($50+/mo total) |
| PlanetScale | Unstable pricing history; community trust concerns |
| Aurora Serverless v2 | $43/mo minimum; overkill for MVP-to-growth |
| Turso | SQLite not suited for complex marketplace transactions |
| Firebase | Google ecosystem lock-in; Firestore pricing unpredictable at scale |
| AWS Amplify | Console complexity; free tier expires; higher per-GB costs |
