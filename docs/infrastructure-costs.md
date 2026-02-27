# Butlers Inc. Infrastructure Cost Breakdown

> Last updated: February 2026
> Currency: USD (GBP equivalents noted where relevant)

---

## Monthly Cost Summary

### Phase 1: MVP Launch (0-500 users)

| Service | Provider | Tier | Monthly Cost |
|---------|----------|------|-------------:|
| Frontend Hosting | Cloudflare Pages | Free | $0.00 |
| Backend + DB + Auth + Realtime | Supabase | Free | $0.00 |
| Payment Processing | Stripe Connect | Standard | $0.00 base |
| Transactional Email | Resend | Free (3K/mo) | $0.00 |
| SMS Notifications | Twilio | Pay-as-you-go | ~$5.00 |
| File Storage | Cloudflare R2 | Free (10 GB) | $0.00 |
| Analytics | PostHog + GA4 | Free | $0.00 |
| Domain (.com + .co.uk) | Cloudflare Registrar | Annual | $1.50 |
| DNS + SSL + CDN | Cloudflare | Free | $0.00 |
| **TOTAL FIXED** | | | **$6.50** |

**Transaction fees (from revenue, not out-of-pocket):**
- ~200 bookings/mo at avg GBP 75
- Stripe: 1.5% + 20p per UK card = ~GBP 28/mo (~$35)

**Free tier limits to monitor:**
- Supabase Free pauses after 1 week of inactivity (upgrade to Pro before real launch)
- Resend: 100 emails/day cap
- Cloudflare R2: 10 GB storage, 10M Class B operations

---

### Phase 2: Early Growth (500-5,000 users)

| Service | Provider | Tier | Monthly Cost |
|---------|----------|------|-------------:|
| Frontend Hosting | Cloudflare Pages | Free | $0.00 |
| Backend + DB + Auth + Realtime | Supabase | Pro | $25.00 |
| Payment Processing | Stripe Connect | Express | $0.00 base |
| Stripe Connect Accounts | Stripe | Per butler | ~$20.00 |
| Transactional Email | Resend | Pro (50K/mo) | $20.00 |
| SMS Notifications | Twilio | ~1,000 SMS/mo | ~$46.00 |
| File Storage | Cloudflare R2 | ~50 GB | $0.75 |
| Analytics | PostHog + GA4 | Free | $0.00 |
| Domain (.com + .co.uk) | Cloudflare Registrar | Annual | $1.50 |
| DNS + SSL + CDN | Cloudflare | Free | $0.00 |
| Error Monitoring | PostHog | Free (100K errors) | $0.00 |
| **TOTAL FIXED** | | | **$113.25** |
| **TOTAL (incl. Stripe Connect)** | | | **$133.25** |

**Transaction fees (from revenue):**
- ~1,500 bookings/mo at avg GBP 80
- Stripe: ~GBP 2,100/mo (~$2,625) deducted from payouts

**Scaling triggers:**
- Supabase Pro mandatory (free tier pauses on inactivity)
- Resend Pro needed when booking confirmations + reminders exceed 3K/mo
- Consider AWS SES migration when email volume exceeds 50K/mo

---

### Phase 3: Scale (5,000-50,000 users)

| Service | Provider | Tier | Monthly Cost |
|---------|----------|------|-------------:|
| Frontend Hosting | Cloudflare Pages | Free | $0.00 |
| Backend + DB + Auth + Realtime | Supabase | Pro + Compute Add-on | $75.00 |
| Payment Processing | Stripe Connect | Express | $0.00 base |
| Stripe Connect Accounts | Stripe | ~100 butlers | ~$200.00 |
| Transactional Email | AWS SES | ~200K/mo | $20.00 |
| SMS Notifications | Twilio | ~8,000 SMS/mo | ~$370.00 |
| File Storage | Cloudflare R2 | ~500 GB | $7.50 |
| Analytics | PostHog | Free or ~$50 | $0-50.00 |
| Privacy Analytics | Plausible | Growth (100K views) | $14.00 |
| Domain (.com + .co.uk) | Cloudflare Registrar | Annual | $1.50 |
| DNS + SSL + CDN | Cloudflare | Free | $0.00 |
| Uptime Monitoring | BetterStack / UptimeRobot | Free | $0.00 |
| **TOTAL FIXED** | | | **$488-538** |
| **TOTAL (incl. Stripe Connect)** | | | **$688-738** |

**Transaction fees (from revenue):**
- ~10,000 bookings/mo at avg GBP 85
- Stripe: ~GBP 13,275/mo (~$16,600) deducted from payouts

---

## Annual Cost Summary

| Phase | Users | Monthly Fixed | Annual Fixed | Biggest Cost Driver |
|-------|------:|-------------:|-------------:|---------------------|
| **MVP Launch** | 0-500 | $6.50 | **$78** | Domain registration |
| **Early Growth** | 500-5K | $133.25 | **$1,599** | Supabase Pro ($300/yr) |
| **Scale** | 5K-50K | $688-738 | **$8,256-8,856** | SMS notifications (53%) |

---

## Per-Service Pricing Details

### Supabase Tiers

| Tier | Monthly | Database | Auth MAU | Storage | Realtime Connections | Realtime Messages |
|------|--------:|----------|----------|---------|---------------------:|------------------:|
| Free | $0 | 500 MB | 50,000 | 1 GB | 200 | 2M/mo |
| Pro | $25 | 8 GB | 100,000 | 100 GB | 500 | 5M/mo |
| Team | $599 | 50 GB | 500,000 | 100 GB | 500 | Included |

**Pro overage rates:**
- Database: $0.125/GB-mo
- File storage: $0.021/GB-mo
- Bandwidth: $0.09/GB
- Auth: $0.003375/MAU
- Edge Functions: $2.50/million invocations
- Realtime connections: $10 per 1,000 peak

### Cloudflare Pages + R2

| Resource | Free Tier | Paid |
|----------|-----------|------|
| Pages bandwidth | Unlimited | Unlimited |
| Pages builds | 500/mo (1 concurrent) | 5,000/mo ($5/mo Workers Paid) |
| R2 storage | 10 GB | $0.015/GB-mo |
| R2 egress | **Free** | **Free** |
| R2 Class A ops | 1M/mo | $4.50/million |
| R2 Class B ops | 10M/mo | $0.36/million |
| Workers requests | 100K/day | 10M/mo ($5/mo), then $0.30/million |

### Stripe Connect (UK Market)

| Fee Type | Rate |
|----------|------|
| UK card transaction | 1.5% + 20p |
| EU card transaction | 2.5% + 20p |
| International card | 3.25% + 20p |
| Connect Express account | $2/active account/mo |
| Payout to butler | 0.25% + 25p per payout |
| Chargeback/dispute | GBP 15 per dispute |
| Identity verification (optional) | $1.50 per verification |

### Email Service Comparison

| Provider | Free Tier | Paid | Cost per 1K Emails |
|----------|-----------|------|--------------------:|
| Resend | 3,000/mo (100/day) | $20/mo for 50K | $0.40 |
| SendGrid | 100/day (~3,000/mo) | $19.95/mo for 50-100K | $0.25 |
| Postmark | 100/mo | $15/mo for 10K | $1.50 |
| AWS SES | 3,000/mo (1st year) | $0.10/1,000 | **$0.10** |

### SMS Pricing (UK Numbers)

| Provider | Outbound UK/SMS | Inbound UK/SMS |
|----------|----------------:|---------------:|
| Twilio | $0.0463 (~3.7p) | $0.0075 (~0.6p) |
| Vonage | $0.0350 (~2.8p) | $0.0057 (~0.5p) |
| AWS SNS | $0.04 (~3.2p) | N/A (one-way) |

---

## Cost Optimization Strategies

### Immediate Savings

1. **Cloudflare over Vercel** saves $20/mo from day one (Vercel requires Pro for commercial use)
2. **Supabase bundles** save $75+/mo vs assembling DB + Auth + Storage + Realtime separately
3. **Cloudflare R2 zero egress** saves ~$45/mo vs AWS S3 at 500 GB with high read traffic

### Growth Phase Savings

4. **Switch Resend to AWS SES** at 50K+ emails/mo saves $70/mo
5. **Web push notifications** (free via Firebase Cloud Messaging) to replace non-critical SMS saves up to $200/mo at scale
6. **Reserve SMS** only for booking confirmations and OTP codes

### Scale Phase Architecture

7. **Supabase Team** ($599/mo) when you need SOC 2, SSO, or >100K MAU
8. **Neon** as a read replica/analytics database for reporting without impacting production
9. **Consider self-hosted Supabase** on Railway/Fly.io if costs exceed $500/mo for database alone

---

## Revenue vs Infrastructure Ratio

| Phase | Monthly Revenue (est.) | Monthly Infra Cost | Infra as % of Revenue |
|-------|----------------------:|-----------:|----------------------:|
| MVP (200 bookings x GBP 75) | ~$18,750 | $6.50 | 0.03% |
| Growth (1,500 bookings x GBP 80) | ~$150,000 | $133 | 0.09% |
| Scale (10,000 bookings x GBP 85) | ~$1,062,500 | $688 | 0.06% |

*Revenue assumes gross booking value. Platform commission (15-20%) would be $2,812-$3,750 at MVP, $22,500-$30,000 at Growth, $159,375-$212,500 at Scale.*

Infrastructure costs remain well below 1% of gross revenue across all phases, indicating strong unit economics.
