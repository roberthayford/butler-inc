# Genie Urgent Email + Text Logo

**Date:** 2026-03-31
**Status:** Approved

## Summary

When a booking originates from the "Summon a Genie" feature (`serviceOption === "genie"`), both the admin notification and customer confirmation emails must visually communicate urgency. Additionally, replace the broken image logo in the email header with a text-based logo matching the website.

## Changes

### 1. EmailHeader — Text Logo

- Replace `<Img src="...butlers-inc-logo.webp">` with styled `<Text>` element
- Font: Georgia serif, ~22px, white, bold — matches website's "Butlers Inc." wordmark
- Keep "Life, handled." tagline
- Same brass background (#B3895D)

### 2. BookingNotificationEmail (admin) — Genie Urgency

When `serviceOption === "genie"`:
- Badge: Red (#CC3333) "URGENT — Genie Request" replaces green "New Booking"
- Heading: "Urgent Genie Request" replaces "New Booking Request"
- Wish callout: Highlighted box showing the customer's wish text (from `notes`)
- Regular bookings unchanged

### 3. BookingConfirmationEmail (customer) — Genie Acknowledgment

When `serviceOption === "genie"`:
- Heading: "Your wish has been received" replaces "Your booking is confirmed"
- Body: "We've received your wish and our team is already on it."
- Service row: Shows "Genie — Urgent Request" instead of "Bespoke"

### 4. API Route — Subject Lines

When `serviceOption === "genie"`:
- Admin: `URGENT: Genie Wish {ref} — Immediate Attention`
- Customer: `Wish Received: {ref} — Butlers Inc.`

### 5. Types — No Change

`serviceOption` already carries `"genie"` — no modifications needed.
