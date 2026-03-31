# Butlers Inc — Pricing Model Implementation Guide

> **Project:** Butlers Inc  
> **Document type:** Technical implementation specification  
> **Stack:** Next.js / React, Supabase (PostgreSQL + Edge Functions), Stripe, Resend  
> **Author:** Rob Hayford  
> **Last updated:** 28 March 2026  
> **Status:** Ready for implementation

---

## 1. Overview

This document specifies how to implement the pricing, booking, and payment system for Butlers Inc. It covers:

- Database schema for butler tiers and bookings
- Pricing engine logic (per-hour rates, urgency multipliers, minimum bookings)
- Time selection UI (start/end pickers in 15-minute intervals)
- Real-time price calculator
- Stripe Checkout integration
- Booking confirmation flow (emails via Resend)
- Bespoke Butler consultation flow (separate path)

The pricing model is **per-hour, per butler tier**. The same hourly rate applies regardless of which specific task is booked within a tier. Urgency multipliers replace the need for separate "Busy" or "Budget" butler categories.

---

## 2. Database Schema

### 2.1 Butler Tiers Configuration Table

This table stores the configurable pricing for each butler tier. Faridah will eventually edit these values via a CMS, so they must not be hardcoded.

```sql
CREATE TABLE butler_tiers (
  id TEXT PRIMARY KEY,               -- 'everyday', 'baby', 'bespoke', 'virtual'
  name TEXT NOT NULL,                 -- Display name: 'Everyday Butler'
  description TEXT,                   -- Short description for service cards
  hourly_rate DECIMAL(10,2) NOT NULL, -- Base hourly rate in GBP
  minimum_hours DECIMAL(4,2),         -- Minimum booking duration (NULL for bespoke)
  booking_type TEXT NOT NULL,         -- 'self_service' or 'consultation'
  display_order INTEGER DEFAULT 0,    -- Sort order on the browse page
  is_active BOOLEAN DEFAULT true,     -- Soft toggle for visibility
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Seed data (pending Faridah's final confirmation on rates):**

```sql
INSERT INTO butler_tiers (id, name, description, hourly_rate, minimum_hours, booking_type, display_order) VALUES
  ('everyday', 'Everyday Butler', 'Everyday errands, deliveries, household tasks, admin support', 50.00, 2.0, 'self_service', 1),
  ('baby', 'Baby Butler', 'Childcare support, school runs, babysitting, child-related errands', 55.00, 3.0, 'self_service', 2),
  ('bespoke', 'Bespoke Butler', 'High-end requests, luxury concierge, travel arrangements, event support', 120.00, NULL, 'consultation', 3),
  ('virtual', 'Virtual Butler', 'Remote or phone-based help: research, bookings, scheduling, admin', 35.00, 1.0, 'self_service', 4);
```

### 2.2 Butler Services Table

Each tier contains multiple specific services. These are the options a customer picks after selecting a tier.

```sql
CREATE TABLE butler_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_id TEXT NOT NULL REFERENCES butler_tiers(id),
  name TEXT NOT NULL,                 -- e.g., 'School Run', 'Household Errands'
  description TEXT,                   -- Brief description shown on selection
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Note:** Services do not affect pricing. They are descriptive labels for the booking record and for Faridah to know what type of task was booked. The hourly rate comes from the tier, not the service.

### 2.3 Urgency Multipliers Configuration Table

```sql
CREATE TABLE urgency_multipliers (
  id TEXT PRIMARY KEY,                -- 'same_day', 'next_day', 'standard', 'early_bird'
  label TEXT NOT NULL,                -- Display label: 'Same-day premium'
  min_hours_notice DECIMAL(6,2),      -- Minimum hours of notice (NULL = no lower bound)
  max_hours_notice DECIMAL(6,2),      -- Maximum hours of notice (NULL = no upper bound)
  multiplier DECIMAL(4,2) NOT NULL,   -- e.g., 1.5, 1.25, 1.0, 0.95
  display_colour TEXT,                -- Hex colour for UI highlighting (e.g., 'CC6600' for amber)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Seed data:**

```sql
INSERT INTO urgency_multipliers (id, label, min_hours_notice, max_hours_notice, multiplier, display_colour) VALUES
  ('same_day', 'Same-day premium', NULL, 12.0, 1.50, 'CC6600'),
  ('next_day', 'Next-day premium', 12.0, 36.0, 1.25, 'CC8800'),
  ('standard', NULL, 36.0, 168.0, 1.00, NULL),
  ('early_bird', 'Early-bird discount', 168.0, NULL, 0.95, '2E8B57');
```

**Logic:** `hours_notice = (service_date + start_time) - now()`. Find the matching row where `min_hours_notice <= hours_notice < max_hours_notice`.

### 2.4 Bookings Table

```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_reference TEXT UNIQUE NOT NULL,  -- Human-readable ref: 'BI-20260328-A1B2'
  
  -- Service details
  tier_id TEXT NOT NULL REFERENCES butler_tiers(id),
  service_id UUID REFERENCES butler_services(id),
  service_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_hours DECIMAL(4,2) NOT NULL,
  
  -- Pricing
  hourly_rate DECIMAL(10,2) NOT NULL,       -- Rate at time of booking (snapshot)
  urgency_multiplier DECIMAL(4,2) NOT NULL DEFAULT 1.00,
  urgency_label TEXT,                        -- e.g., 'Same-day premium'
  subtotal DECIMAL(10,2) NOT NULL,           -- hourly_rate × duration_hours
  total_price DECIMAL(10,2) NOT NULL,        -- subtotal × urgency_multiplier
  currency TEXT NOT NULL DEFAULT 'gbp',
  
  -- Customer details
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  additional_notes TEXT,
  
  -- Payment
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id TEXT,
  payment_status TEXT DEFAULT 'pending',     -- 'pending', 'paid', 'refunded', 'failed'
  
  -- Booking status
  status TEXT DEFAULT 'pending',             -- 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  confirmed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);
```

### 2.5 Bespoke Consultation Bookings Table

Separate table for Bespoke Butler consultation requests, which follow a different flow.

```sql
CREATE TABLE bespoke_consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_reference TEXT UNIQUE NOT NULL,  -- 'BC-20260328-C3D4'
  
  -- Request details
  preferred_service_date DATE,
  request_description TEXT NOT NULL,
  
  -- Consultation call
  consultation_date DATE NOT NULL,
  consultation_time TIME NOT NULL,
  
  -- Customer details
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  
  -- Deposit (optional, pending Faridah's decision)
  deposit_amount DECIMAL(10,2),
  deposit_stripe_session_id TEXT,
  deposit_payment_status TEXT DEFAULT 'pending',  -- 'pending', 'paid', 'waived'
  
  -- Outcome (filled after consultation)
  quoted_price DECIMAL(10,2),
  final_stripe_payment_link TEXT,
  final_payment_status TEXT,
  
  -- Status
  status TEXT DEFAULT 'pending',  -- 'pending', 'consultation_booked', 'quoted', 'accepted', 'completed', 'cancelled'
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 2.6 Booking Reference Generator

Human-readable references for customer-facing communications:

```sql
CREATE OR REPLACE FUNCTION generate_booking_reference()
RETURNS TEXT AS $$
DECLARE
  ref TEXT;
  date_part TEXT;
  random_part TEXT;
BEGIN
  date_part := TO_CHAR(NOW(), 'YYYYMMDD');
  random_part := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));
  ref := 'BI-' || date_part || '-' || random_part;
  RETURN ref;
END;
$$ LANGUAGE plpgsql;
```

---

## 3. Pricing Engine

### 3.1 Server-Side Price Calculation (Supabase Edge Function)

This is the authoritative pricing calculation. The frontend displays a preview, but the server recalculates before creating the Stripe session to prevent tampering.

**Endpoint:** `POST /api/calculate-price`

**Request:**

```json
{
  "tier_id": "everyday",
  "service_date": "2026-03-28",
  "start_time": "09:00",
  "end_time": "13:00"
}
```

**Response:**

```json
{
  "tier": {
    "id": "everyday",
    "name": "Everyday Butler",
    "hourly_rate": 50.00,
    "minimum_hours": 2.0
  },
  "duration_hours": 4.0,
  "urgency": {
    "id": "same_day",
    "label": "Same-day premium",
    "multiplier": 1.5,
    "display_colour": "CC6600"
  },
  "subtotal": 200.00,
  "total": 300.00,
  "currency": "gbp",
  "breakdown": "£50.00/hr × 4hrs × 1.5 = £300.00"
}
```

**Calculation logic (pseudocode):**

```
function calculatePrice(tier_id, service_date, start_time, end_time):
  
  // 1. Fetch tier config
  tier = db.query("SELECT * FROM butler_tiers WHERE id = ? AND is_active = true", tier_id)
  if (!tier) throw Error("Invalid butler tier")
  if (tier.booking_type === "consultation") throw Error("Bespoke tier uses consultation flow, not self-service pricing")
  
  // 2. Calculate duration
  start = parseTime(start_time)  // e.g., 09:00
  end = parseTime(end_time)      // e.g., 13:00
  duration_hours = (end - start) / 60  // in hours, e.g., 4.0
  
  // 3. Validate minimum booking
  if (duration_hours < tier.minimum_hours):
    throw Error("Minimum booking for {tier.name} is {tier.minimum_hours} hours")
  
  // 4. Validate time range
  if (start < parseTime("06:00") || end > parseTime("23:00")):
    throw Error("Bookings are available between 06:00 and 23:00")
  if (end <= start):
    throw Error("End time must be after start time")
  
  // 5. Calculate urgency multiplier
  service_datetime = combineDateAndTime(service_date, start_time)
  hours_notice = (service_datetime - now()) / 3600  // hours until service starts
  
  if (hours_notice < 0):
    throw Error("Cannot book a service in the past")
  
  urgency = db.query(
    "SELECT * FROM urgency_multipliers WHERE is_active = true 
     AND (min_hours_notice IS NULL OR min_hours_notice <= ?) 
     AND (max_hours_notice IS NULL OR max_hours_notice > ?)
     ORDER BY min_hours_notice ASC LIMIT 1",
    hours_notice, hours_notice
  )
  
  multiplier = urgency ? urgency.multiplier : 1.0
  
  // 6. Calculate totals
  subtotal = tier.hourly_rate * duration_hours
  total = subtotal * multiplier
  
  // 7. Round to 2 decimal places
  total = Math.round(total * 100) / 100
  
  return {
    tier, duration_hours, urgency, subtotal, total,
    currency: "gbp",
    breakdown: `£${tier.hourly_rate}/hr × ${duration_hours}hrs × ${multiplier} = £${total}`
  }
```

### 3.2 Frontend Price Preview

The frontend mirrors the server-side calculation for instant UI updates, but the server is always the source of truth.

```typescript
// types.ts
interface PriceCalculation {
  tierName: string;
  hourlyRate: number;
  durationHours: number;
  urgencyMultiplier: number;
  urgencyLabel: string | null;
  urgencyColour: string | null;
  subtotal: number;
  total: number;
  breakdown: string;
}

// calculatePricePreview.ts
// This runs client-side for instant UI feedback.
// The server recalculates before Stripe session creation.

function calculatePricePreview(
  hourlyRate: number,
  startTime: string,    // "09:00"
  endTime: string,      // "13:00"
  serviceDate: string,  // "2026-03-28"
): PriceCalculation {
  
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  const durationHours = (end - start) / 60;
  
  // Urgency calculation
  const serviceDateTime = new Date(`${serviceDate}T${startTime}:00`);
  const hoursNotice = (serviceDateTime.getTime() - Date.now()) / (1000 * 60 * 60);
  
  let urgencyMultiplier = 1.0;
  let urgencyLabel: string | null = null;
  let urgencyColour: string | null = null;
  
  if (hoursNotice < 12) {
    urgencyMultiplier = 1.5;
    urgencyLabel = "Same-day premium";
    urgencyColour = "#CC6600";
  } else if (hoursNotice < 36) {
    urgencyMultiplier = 1.25;
    urgencyLabel = "Next-day premium";
    urgencyColour = "#CC8800";
  } else if (hoursNotice >= 168) {
    urgencyMultiplier = 0.95;
    urgencyLabel = "Early-bird discount";
    urgencyColour = "#2E8B57";
  }
  
  const subtotal = hourlyRate * durationHours;
  const total = Math.round(subtotal * urgencyMultiplier * 100) / 100;
  
  return {
    tierName: "",  // populated by caller
    hourlyRate,
    durationHours,
    urgencyMultiplier,
    urgencyLabel,
    urgencyColour,
    subtotal,
    total,
    breakdown: `£${hourlyRate}/hr × ${durationHours}hrs${urgencyMultiplier !== 1.0 ? ` × ${urgencyMultiplier}` : ''} = £${total.toFixed(2)}`
  };
}

function timeToMinutes(time: string): number {
  const [hours, mins] = time.split(":").map(Number);
  return hours * 60 + mins;
}
```

---

## 4. Time Selection UI

### 4.1 Time Picker Specification

**Start time picker:**
- Dropdown or scroll selector
- Options: 06:00 to 22:00 in 15-minute intervals
- If the selected date is today, grey out / remove times that have already passed
- Default: no selection (force the customer to choose)

**End time picker:**
- Options start from `start_time + minimum_booking_hours`
- Runs to 23:00 in 15-minute intervals
- Updates dynamically when start time changes
- If start time is 09:00 and minimum is 2 hours, first available end time is 11:00

**Duration display:**
- Shown between / alongside the time pickers
- Format: "4 hours" or "2 hours 30 minutes"
- Updates in real time

### 4.2 Time Slot Generator

```typescript
function generateTimeSlots(
  startHour: number = 6,
  endHour: number = 22,
  intervalMinutes: number = 15
): string[] {
  const slots: string[] = [];
  for (let h = startHour; h <= endHour; h++) {
    for (let m = 0; m < 60; m += intervalMinutes) {
      if (h === endHour && m > 0) break;  // stop at endHour:00
      slots.push(
        `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`
      );
    }
  }
  return slots;
}

function getAvailableEndTimes(
  startTime: string,
  minimumHours: number,
  maxEndHour: number = 23
): string[] {
  const startMinutes = timeToMinutes(startTime);
  const earliestEnd = startMinutes + (minimumHours * 60);
  
  return generateTimeSlots(0, maxEndHour, 15)
    .filter(slot => timeToMinutes(slot) >= earliestEnd);
}

function filterPastTimes(slots: string[], selectedDate: string): string[] {
  const today = new Date().toISOString().split("T")[0];
  if (selectedDate !== today) return slots;
  
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  return slots.filter(slot => timeToMinutes(slot) > currentMinutes);
}
```

### 4.3 Date Picker Rules

- Minimum selectable date: today
- Maximum selectable date: 90 days from today (configurable)
- Past dates greyed out and unselectable
- When a date is selected, the urgency multiplier recalculates and the price summary updates immediately
- Consider highlighting today and tomorrow with visual indicators since they trigger urgency pricing

---

## 5. Real-Time Price Calculator UI

### 5.1 Booking Summary Panel

This panel is always visible during the booking flow and updates live.

**Desktop:** Sticky sidebar on the right, or fixed panel below the form.
**Mobile:** Sticky bottom bar showing just the total, expandable to full breakdown.

### 5.2 Display States

**State 1: No selections yet**
```
┌─────────────────────────────────────┐
│  BOOKING SUMMARY                    │
│                                     │
│  Select a date and time to see      │
│  your price.                        │
└─────────────────────────────────────┘
```

**State 2: Partial selections (date chosen, no time yet)**
```
┌─────────────────────────────────────┐
│  BOOKING SUMMARY                    │
│                                     │
│  Everyday Butler                    │
│  Tuesday 25 March 2026              │
│                                     │
│  Choose your start and end time     │
│  to see the price.                  │
└─────────────────────────────────────┘
```

**State 3: Complete selections (standard rate)**
```
┌─────────────────────────────────────┐
│  BOOKING SUMMARY                    │
│                                     │
│  Everyday Butler — Household        │
│  Errands                            │
│                                     │
│  Friday 28 March 2026               │
│  09:00 – 13:00 (4 hours)            │
│                                     │
│  ─────────────────────────────────  │
│  Total: £200.00                     │
│  (£50/hr × 4hrs)                    │
└─────────────────────────────────────┘
```

**State 4: Complete selections (urgency multiplier applied)**
```
┌─────────────────────────────────────┐
│  BOOKING SUMMARY                    │
│                                     │
│  Everyday Butler — Household        │
│  Errands                            │
│                                     │
│  Tuesday 25 March 2026              │
│  09:00 – 13:00 (4 hours)            │
│                                     │
│  ⚡ Same-day premium: 1.5x applied  │
│                                     │
│  ─────────────────────────────────  │
│  Total: £300.00                     │
│  (£50/hr × 4hrs × 1.5)             │
└─────────────────────────────────────┘
```

### 5.3 UI Behaviour Rules

- Price updates instantly as the customer changes any input (date, start time, end time)
- If urgency multiplier applies, show the label in amber (#CC6600), not red (red implies error)
- If no urgency premium, do not show the multiplier line at all
- Always show the maths breakdown so the customer understands how the total is calculated
- The "Pay Now" / "Continue to Payment" button is disabled until all required fields are complete
- If the customer changes the date from a future date to today mid-flow, the urgency multiplier kicks in and the total increases. Briefly highlight the change (subtle animation or flash) so it is not a shock

### 5.4 Edge Cases

| Scenario | Behaviour |
|----------|-----------|
| Same-day booking, less than minimum hours left in the day | Show message: "Same-day bookings need at least [X] hours. Please choose tomorrow or later." Disable the Pay button. |
| Customer picks end time before start time | Prevent this in the UI by only showing valid end times based on the start time selection. |
| Customer picks a date in the past | Prevent this in the date picker by greying out past dates. |
| Service start time has already passed today | Filter out past times from the start time picker when today is selected. |
| Midnight crossover (start 22:00, end 01:00) | Not supported. End time cannot exceed 23:00. Show a message if the customer needs an overnight service, suggesting they book via Bespoke. |

---

## 6. Service Cards (Browse Page)

### 6.1 Card Display Format

Each butler tier is displayed as a card on the browse/selection page:

```
┌─────────────────────────────────────┐
│                                     │
│  EVERYDAY BUTLER                    │
│                                     │
│  From £50/hour                      │
│                                     │
│  Everyday errands, deliveries,      │
│  household tasks, admin support     │
│                                     │
│  [ Book Now ]                       │
│                                     │
└─────────────────────────────────────┘
```

**"From" price logic:** Always display the base rate (the 72+ hours / standard rate). Do not show the urgency-adjusted price on the browse page. Urgency pricing is communicated during the booking flow, not before.

### 6.2 Data Source

Cards are populated from the `butler_tiers` table:

```typescript
const tiers = await supabase
  .from("butler_tiers")
  .select("*")
  .eq("is_active", true)
  .order("display_order", { ascending: true });
```

---

## 7. Stripe Integration

### 7.1 Stripe Checkout Session Creation

**Endpoint:** `POST /api/create-checkout-session`

**Request payload:**

```json
{
  "tier_id": "everyday",
  "service_id": "uuid-of-selected-service",
  "service_date": "2026-03-28",
  "start_time": "09:00",
  "end_time": "13:00",
  "customer_name": "Jane Smith",
  "customer_email": "jane@example.com",
  "customer_phone": "+447700900000",
  "additional_notes": "Please use the side entrance"
}
```

**Server-side logic:**

```typescript
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function createCheckoutSession(payload) {
  // 1. Recalculate price server-side (NEVER trust the frontend price)
  const pricing = await calculatePrice(
    payload.tier_id,
    payload.service_date,
    payload.start_time,
    payload.end_time
  );
  
  // 2. Create a pending booking record
  const booking = await supabase.from("bookings").insert({
    booking_reference: generateBookingReference(),
    tier_id: payload.tier_id,
    service_id: payload.service_id,
    service_date: payload.service_date,
    start_time: payload.start_time,
    end_time: payload.end_time,
    duration_hours: pricing.duration_hours,
    hourly_rate: pricing.tier.hourly_rate,
    urgency_multiplier: pricing.urgency.multiplier,
    urgency_label: pricing.urgency.label,
    subtotal: pricing.subtotal,
    total_price: pricing.total,
    customer_name: payload.customer_name,
    customer_email: payload.customer_email,
    customer_phone: payload.customer_phone,
    additional_notes: payload.additional_notes,
    status: "pending",
    payment_status: "pending"
  }).select().single();
  
  // 3. Create Stripe Checkout Session
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [{
      price_data: {
        currency: "gbp",
        unit_amount: Math.round(pricing.total * 100),  // Stripe uses pence
        product_data: {
          name: `${pricing.tier.name} — ${payload.service_name || "Butler Service"}`,
          description: `${payload.service_date}, ${payload.start_time}–${payload.end_time} (${pricing.duration_hours} hours)`,
        },
      },
      quantity: 1,
    }],
    customer_email: payload.customer_email,
    success_url: `${process.env.SITE_URL}/booking/confirmation?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.SITE_URL}/booking/cancelled?booking_id=${booking.id}`,
    metadata: {
      booking_id: booking.id,
      booking_reference: booking.booking_reference,
      tier_id: payload.tier_id,
      service_date: payload.service_date,
      start_time: payload.start_time,
      end_time: payload.end_time,
      duration_hours: pricing.duration_hours.toString(),
      urgency_multiplier: pricing.urgency.multiplier.toString(),
    },
  });
  
  // 4. Update booking with Stripe session ID
  await supabase.from("bookings").update({
    stripe_checkout_session_id: session.id,
  }).eq("id", booking.id);
  
  // 5. Return session URL for redirect
  return { url: session.url };
}
```

### 7.2 Stripe Webhook Handler

**Endpoint:** `POST /api/webhooks/stripe`

Listen for `checkout.session.completed`:

```typescript
async function handleStripeWebhook(event) {
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const bookingId = session.metadata.booking_id;
    
    // 1. Update booking status
    await supabase.from("bookings").update({
      status: "confirmed",
      payment_status: "paid",
      stripe_payment_intent_id: session.payment_intent,
      confirmed_at: new Date().toISOString(),
    }).eq("id", bookingId);
    
    // 2. Fetch full booking details for emails
    const booking = await supabase
      .from("bookings")
      .select("*, butler_tiers(*)")
      .eq("id", bookingId)
      .single();
    
    // 3. Send confirmation email to customer
    await sendCustomerConfirmationEmail(booking);
    
    // 4. Send notification email to Faridah
    await sendOwnerNotificationEmail(booking);
  }
}
```

### 7.3 Bespoke Deposit (If Faridah Opts In)

If a deposit is required for Bespoke consultations, use the same Stripe Checkout flow but with a fixed amount:

```typescript
const session = await stripe.checkout.sessions.create({
  mode: "payment",
  line_items: [{
    price_data: {
      currency: "gbp",
      unit_amount: 15000,  // £150.00 in pence
      product_data: {
        name: "Bespoke Butler — Consultation Booking Deposit",
        description: "Refundable deposit, deducted from your final bill",
      },
    },
    quantity: 1,
  }],
  metadata: {
    consultation_id: consultation.id,
    booking_type: "bespoke_deposit",
  },
  // ... success_url, cancel_url, customer_email
});
```

---

## 8. Confirmation Emails (Resend)

### 8.1 Customer Confirmation Email

**Trigger:** Stripe webhook `checkout.session.completed`  
**Sender:** bookings@butlersinc.com  
**Template variables:**

```json
{
  "customer_name": "Jane",
  "booking_reference": "BI-20260328-A1B2",
  "tier_name": "Everyday Butler",
  "service_name": "Household Errands",
  "service_date": "Friday 28 March 2026",
  "start_time": "09:00",
  "end_time": "13:00",
  "duration": "4 hours",
  "total_paid": "£200.00",
  "urgency_label": null,
  "additional_notes": "Please use the side entrance"
}
```

**Subject line:** `Booking Confirmed — {booking_reference}`

### 8.2 Owner Notification Email (Faridah)

**Recipient:** hello@butlersinc.com  
**Subject line:** `New Booking — {tier_name} — {service_date}`  
**Content:** Same variables as customer email, plus customer contact details (email, phone) so Faridah can reach out if needed.

---

## 9. Bespoke Butler Consultation Flow

### 9.1 Booking Steps

1. Customer selects "Bespoke Butler" on browse page
2. Picks a preferred date for the service (calendar picker)
3. Describes the request (free-text textarea, placeholder: "Tell us what you need...")
4. Books a consultation call:
   - Date picker for the call
   - Time picker for the call (15-minute intervals, same component as self-service)
   - Available slots initially hardcoded, later editable via CMS
5. (Optional) Pays deposit via Stripe Checkout
6. Confirmation page + emails to both parties

### 9.2 Post-Consultation Flow (Manual)

After the consultation call:
1. Faridah determines scope and price
2. Faridah creates a Stripe Payment Link via the Stripe dashboard (or a future admin panel) for the remaining balance
3. Payment Link is sent to the customer via email
4. Customer pays
5. Booking is confirmed

This is deliberately manual for launch. Automating the post-consultation quoting process is a phase 2 item.

---

## 10. Validation Rules Summary

| Field | Rule |
|-------|------|
| Butler tier | Must exist in `butler_tiers` and be active |
| Service | Must belong to the selected tier and be active |
| Service date | Must be today or future, max 90 days ahead |
| Start time | Between 06:00 and 22:00, in 15-min intervals. If today, must be in the future |
| End time | After start time, max 23:00, in 15-min intervals |
| Duration | Must meet or exceed the tier's minimum booking hours |
| Customer email | Valid email format (RFC 5322) |
| Customer phone | Valid UK mobile or landline format |
| Customer name | Required, min 2 characters |

---

## 11. Environment Variables

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Resend
RESEND_API_KEY=re_...

# App
SITE_URL=https://butlersinc.com
BOOKING_EMAIL_FROM=bookings@butlersinc.com
OWNER_NOTIFICATION_EMAIL=hello@butlersinc.com
```

---

## 12. Build Sequence

| Order | Task | Effort | Depends On |
|-------|------|--------|------------|
| 1 | Create database tables and seed data | 30 mins | Faridah confirms rates |
| 2 | Build pricing engine (Edge Function) | 2–3 hrs | Step 1 |
| 3 | Build time selection UI components | 2–3 hrs | None |
| 4 | Build real-time price calculator panel | 2–3 hrs | Steps 2, 3 |
| 5 | Wire up complete self-service booking form | 2–3 hrs | Steps 3, 4 |
| 6 | Stripe Checkout integration | 3–4 hrs | Steps 2, 5 |
| 7 | Webhook handler + booking record updates | 2–3 hrs | Step 6 |
| 8 | Confirmation emails via Resend | 1–2 hrs | Step 7 |
| 9 | Bespoke consultation booking flow | 3–4 hrs | Step 5 (shared components) |
| 10 | Bespoke deposit integration (if confirmed) | 1–2 hrs | Steps 6, 9 |

**Total estimated effort:** 18–28 hours

---

## 13. What Is NOT in Scope (Phase 2)

- Membership billing (recurring Stripe subscriptions)
- Distance-based pricing via Google Maps API
- Self-service cancellation and automated refunds
- Cross-country surcharge automation
- Admin panel / CMS for Faridah to edit tiers and prices
- Post-consultation automated quoting for Bespoke
- A/B testing on pricing
- Discount codes / promotional pricing

---

## 14. Open Decisions (Awaiting Faridah)

| Decision | Options | Recommended | Status |
|----------|---------|-------------|--------|
| Everyday Butler hourly rate | £45 / £50 / £55 / £60 | £50/hr | Pending |
| Baby Butler hourly rate | £50 / £55 / £60 / £65 | £55/hr | Pending |
| Bespoke Butler hourly rate | £90 / £100 / £120 / £150 | £120/hr | Pending |
| Virtual Butler hourly rate | £30 / £35 / £40 | £35/hr | Pending |
| Bespoke consultation deposit | None / £100 / £150 / £200 | £150 | Pending |
| Minimum booking (Everyday) | 1hr / 2hr / 3hr | 2hr | Pending |
| Service tier count at launch | 4 (recommended) / 6 (original) | 4 | Pending |

**Note:** Development can proceed with the recommended values as placeholders. Swap in Faridah's confirmed figures before going live.
