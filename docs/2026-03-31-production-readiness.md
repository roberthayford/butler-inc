# Butlers Inc. — Production Readiness Report

**Date:** 31 March 2026
**Prepared for:** Faridah
**Status:** Soft launch ready (with items below outstanding)

---

## What's Built and Working

The website is functional end-to-end with the following in place:

- **6 butler types** with individual pages, service options, and booking forms
- **Pricing engine** — hourly rates, urgency multipliers, dynamic price calculation
- **Booking flow** — service selection → date/time → customer details → price summary → checkout
- **Genie emergency service** — sticky bar CTA + drawer form (wish → contact → success)
- **Email notifications** — customer confirmation + admin notification via Resend (from `bookings@butlersinc.com`)
- **Authentication** — Supabase login/signup, protected dashboard and admin routes
- **Member dashboard** — booking history for logged-in users
- **Admin content editor** — edit butler page content (authenticated)
- **Simulated payments** — full checkout flow using a mock payment page (no real money taken)
- **200 automated tests** passing (196/200 — 4 minor test drift issues)

---

## What's Needed Before Go-Live

### 1. Stripe Account Setup (Faridah — required)

To take real payments, Butlers Inc. needs a **Stripe account** connected to a UK business bank account.

**Steps:**
1. Go to [stripe.com](https://stripe.com) and create an account
2. Complete business verification (company name, address, director details)
3. Add a UK bank account for payouts
4. In the Stripe Dashboard, go to **Developers → API keys** and note:
   - **Secret key** (starts with `sk_live_...`)
   - **Publishable key** (starts with `pk_live_...`)
5. In the Stripe Dashboard, go to **Developers → Webhooks** and create an endpoint:
   - **URL:** `https://yourdomain.com/api/webhooks/payment-complete`
   - **Events to listen for:** `checkout.session.completed`
   - Note the **Webhook signing secret** (starts with `whsec_...`)

**Send me these 3 values** (Secret key, Publishable key, Webhook secret) and I'll wire them into the site. They go into secure environment variables — never in the code.

**Cost:** Stripe charges **1.5% + 20p per UK card transaction**. No monthly fee. For a typical £75 booking, that's £1.33 per transaction (~£27/month at 200 bookings).

---

### 2. Domain & DNS (Faridah — required)

The site needs a production domain. Questions to decide:

- **What domain?** e.g. `butlersinc.com`, `butlersinc.co.uk`, `ohmybutler.com`
- **Do you already own a domain?** If so, share the registrar details
- **Email sending domain** — Resend currently sends from `bookings@butlersinc.com`. The domain used for email needs DNS records (SPF, DKIM) to avoid spam filters. I'll set these up once the domain is confirmed.

---

### 3. Supabase Upgrade (Faridah — required before real users)

The database is on Supabase's **free tier**, which has these limits:
- **Pauses after 1 week of inactivity** (site goes down if no traffic for 7 days)
- 500 MB database storage
- 2 GB bandwidth

**Action:** Upgrade to **Supabase Pro** ($25/month) before launch. This removes the pause limit and gives 8 GB storage + 250 GB bandwidth.

Go to [supabase.com/dashboard](https://supabase.com/dashboard) → Project settings → Billing → Upgrade to Pro.

---

### 4. Security Hardening (Robert — I'll do this)

These are code changes I'll make before launch:

| Item | What | Why |
|------|------|-----|
| Security headers | Add CSP, HSTS, X-Frame-Options to site config | Prevents clickjacking, XSS, protocol downgrade attacks |
| Dev bypass gate | Ensure `DEV_BYPASS_DB` flag cannot activate in production | Prevents accidental bypass of real database |
| Webhook verification | Verify Stripe webhook signatures | Prevents fake payment confirmations |
| Remove debug logging | Strip `console.log` statements from API routes | Prevents leaking booking data to server logs |
| Fix failing tests | Update 4 tests that drifted from component changes | Ensures test suite is fully green |

**No action needed from you** — I'll do this before we flip to production.

---

### 5. Resend Email Limits (Awareness)

Resend's free tier allows **100 emails/day** (3,000/month). Each booking sends 2 emails (customer + admin) = **50 bookings/day max**.

If you expect higher volume at launch, upgrade to Resend Pro ($20/month → 50,000 emails/month).

---

## What Can Wait (Post-Launch)

These are improvements for after the initial soft launch:

| Item | Priority | When |
|------|----------|------|
| Homepage content (currently sparse — just hero + CTA) | High | Before public marketing push |
| Accessibility fixes (visible form labels, colour contrast) | High | Before public launch |
| CI/CD pipeline (automated testing on every code push) | Medium | Before adding more developers |
| Error monitoring (Sentry — catch bugs in real-time) | Medium | After first 50 real bookings |
| Analytics (PostHog or similar — track user behaviour) | Medium | When optimising conversion |
| E2E browser tests (Playwright) | Low | When site is stable |

---

## Cost Summary: Soft Launch

| Service | Monthly Cost |
|---------|-------------|
| Supabase Pro | $25 (~£20) |
| Resend (free tier, upgradeable) | $0 |
| Stripe (per-transaction only) | ~1.5% + 20p per payment |
| Vercel hosting (free tier) | $0 |
| Domain (annual) | ~$12/year (~£10/year) |
| **Total fixed monthly** | **~£20/month + transaction fees** |

---

## Action Items Summary

| # | What | Who | Status |
|---|------|-----|--------|
| 1 | Create Stripe account + send API keys | Faridah | ⬜ Not started |
| 2 | Confirm production domain | Faridah | ⬜ Not started |
| 3 | Upgrade Supabase to Pro | Faridah | ⬜ Not started |
| 4 | Security hardening + Stripe integration | Robert | ⬜ Blocked on #1 |
| 5 | DNS + email domain setup | Robert | ⬜ Blocked on #2 |
| 6 | Deploy to production | Robert | ⬜ Blocked on #1–5 |
