# Email Hosting Design: Butlers Inc.

**Date:** 2026-02-24
**Status:** Approved
**Decision:** Proton Mail for Business (Mail Essentials)

## Context

Butlers Inc. needs a reliable email hosting provider for business mailboxes on the `butlersinc.com` domain. The platform is a premium personal concierge marketplace targeting discerning professionals, families, and executives across England. The service handles sensitive client information including child logistics, property access, luxury purchases, and executive schedules.

### Requirements

- 3 mailboxes: `hello@butlersinc.com`, `bookings@butlersinc.com`, `support@butlersinc.com`
- Reliable deliverability for business correspondence
- Mobile access (iOS/Android)
- Reputable provider that reflects the premium brand
- Founder prioritises privacy
- Scalable and future-proof

### Scope Clarification

This decision covers **email hosting** (team mailboxes for human-to-human correspondence) only. **Transactional email** (automated booking confirmations, reminders) is handled separately via Resend/AWS SES through Supabase Edge Functions, as documented in `docs/implementation-plan.md`.

## Options Evaluated

### Option 1: Google Workspace — $21/mo (3 users at $7/user)

| Aspect | Assessment |
|--------|-----------|
| Deliverability | Best in class — Gmail infrastructure, near-zero inbox rejection |
| Brand perception | Universally trusted |
| Mobile | Excellent (Gmail app) |
| Storage | 30GB/user |
| Security | Standard TLS, Google has access to contents |
| Privacy | Weak — data used for ad targeting, US jurisdiction |

### Option 2: Microsoft 365 Exchange Online — $18/mo (3 users at $6/user)

| Aspect | Assessment |
|--------|-----------|
| Deliverability | Excellent — on par with Google |
| Brand perception | Enterprise/corporate |
| Mobile | Good (Outlook app) |
| Storage | 50GB/user |
| Security | Standard TLS |
| Privacy | Standard — US jurisdiction |

### Option 3: Zoho Mail (Mail Lite) — $3/mo (3 users at $1/user)

| Aspect | Assessment |
|--------|-----------|
| Deliverability | Good — occasionally flagged by aggressive spam filters |
| Brand perception | Less recognised among target market |
| Mobile | Adequate |
| Storage | 5GB/user |
| Security | Standard TLS |
| Privacy | Standard |

### Option 4: Proton Mail for Business (Mail Essentials) — $20.97/mo (3 users at $6.99/user)

| Aspect | Assessment |
|--------|-----------|
| Deliverability | Good+ — SPF/DKIM/DMARC supported, established sender reputation |
| Brand perception | Premium, privacy-first, Swiss quality |
| Mobile | Good (Proton Mail app on iOS/Android) |
| Storage | 15GB/user |
| Security | End-to-end encryption, zero-access encryption at rest |
| Privacy | Swiss jurisdiction, strongest privacy framework globally |

## Decision: Proton Mail for Business (Mail Essentials)

**Cost:** $6.99/user/mo = $20.97/mo for 3 mailboxes (annual billing)

### Rationale

#### 1. Privacy aligns with founder values and brand positioning

Butlers Inc. handles sensitive client information — child logistics (Baby Butler), property access codes (Base Butler), luxury purchase details (Bougie Butler), executive schedules (Busy Butler). End-to-end encryption is a genuine operational requirement, not a marketing gimmick. "Your communications are encrypted and stored in Switzerland" is a trust signal that resonates with the target market of discerning professionals and executives.

#### 2. Deliverability is sufficient for the use case

The deliverability gap between Google and Proton matters for cold outreach and mass email. Butlers Inc. will do neither from these mailboxes:

- `hello@butlersinc.com` — Inbound inquiries, replying to clients (negligible risk)
- `bookings@butlersinc.com` — Manual booking communication (low risk, established relationships)
- `support@butlersinc.com` — Client support threads (negligible risk, ongoing conversations)

Automated emails (confirmations, reminders) go through Resend/AWS SES independently.

#### 3. Price parity with Google Workspace

At $20.97/mo vs $21/mo, cost is a non-factor. Proton delivers encryption, Swiss privacy, and brand alignment that Google does not.

#### 4. Future-proof from a regulatory standpoint

UK GDPR and the Data Protection Act 2018 are trending stricter. End-to-end encrypted business communications stored under Swiss jurisdiction puts the company ahead of regulatory trends rather than reacting to them. This matters especially for a service handling client PII.

#### 5. Clear scalability path

| Growth stage | Configuration | Cost |
|-------------|--------------|------|
| MVP (now) | 3 users, Mail Essentials | $20.97/mo |
| Team of 5-10 | Add users at $6.99/user | $35-70/mo |
| More storage/branding needed | Upgrade to Professional ($9.99/user) | $29.97-99.90/mo |
| Full suite | Business Suite with 1TB + VPN ($12.99/user) | $38.97-129.90/mo |

### Accepted trade-offs

| Trade-off | Why it is acceptable |
|-----------|---------------------|
| No Google Drive/Docs ecosystem | Only email + mobile access is required |
| Slightly less polished mobile app than Gmail | Proton Mail app is good; adequate for the use case |
| Less familiar to some corporate spam filters | Mitigated by proper SPF/DKIM/DMARC setup and the fact that no cold emailing occurs |
| 15GB storage vs 30GB (Google) | Sufficient for business email; upgrade path exists |

## Architecture: Email hosting vs transactional email

```
Client communication (human-to-human):
  Proton Mail (Mail Essentials)
    ├── hello@butlersinc.com
    ├── bookings@butlersinc.com
    └── support@butlersinc.com

Automated transactional email (system-to-client):
  Supabase Edge Function
    └── Resend API (MVP) → AWS SES (at scale)
        └── Booking confirmations, reminders, notifications
```

These two systems are independent. The email hosting choice has zero impact on the transactional email pipeline.

## Setup steps

1. Purchase Proton Mail for Business (Mail Essentials) — 3 users, annual billing
2. Add `butlersinc.com` as a custom domain in Proton admin console
3. Configure DNS records at domain registrar:
   - MX records (Proton mail servers)
   - SPF record (authorise Proton to send on behalf of domain)
   - DKIM record (email authentication)
   - DMARC record (policy for failed authentication)
4. Create the three mailboxes: `hello@`, `bookings@`, `support@`
5. Set up catch-all address to capture any misaddressed emails
6. Install Proton Mail app on team mobile devices
7. Update codebase references from `bookings@butlersinc.com` mailto links to ensure consistency

## Cost summary

| Item | Monthly cost |
|------|-------------|
| Proton Mail Essentials (3 users) | $20.97 |
| Resend transactional email (free tier) | $0.00 |
| **Total email infrastructure** | **$20.97/mo** |

This integrates into the broader infrastructure costs documented in `docs/infrastructure-costs.md`.
