# Real-Stripe one-off booking fulfilment

## Context

The Stripe integration wired the membership subscription flow end-to-end, but
left a known gap: **real-Stripe one-off butler booking payments are not
provisioned.** A `mode=payment` `checkout.session.completed` event reaches
`/api/webhooks/stripe`, where `handleCheckoutCompleted` early-returns on
`!d.subscription`. The endpoint that actually fulfils a booking
(`/api/webhooks/payment-complete`) is only called by the mock simulator, which
does not run when `PAYMENT_GATEWAY=stripe`. Result with real Stripe: the card is
charged, but the booking is never marked paid, member hours are not decremented,
and no confirmation email is sent.

This closes that gap so one-off bookings work under real Stripe, matching the
behavior the mock already provides.

## Scope

Happy-path fulfilment only — `checkout.session.completed` with `mode=payment`
and a paid session. Refunds, disputes, and async-payment failures are out of
scope (no current product need).

## Design

### New shared module: `src/lib/payment/booking-fulfilment.ts`

Extract the body of `/api/webhooks/payment-complete` into one reusable function:

```
fulfilBooking(sessionId: string): Promise<FulfilResult>
  1. gateway.verifyPayment(sessionId)        → not verified → { status: "unverified" }
  2. repo.findByCheckoutSession(sessionId)   → missing      → { status: "not_found" }
  3. booking.payment_status === "paid"       → { status: "already_paid", bookingReference }
  4. repo.confirmPayment(booking.id, paymentIntentId)   (throws on hard failure)
  5. decrement member hours when booking.user_id && urgency_label === "Member rate"
     (atomic optimistic lock; failure logged, non-fatal — unchanged)
  6. after(() => send confirmation + notification emails)   (failure logged, non-fatal)
  → { status: "fulfilled", bookingReference }
```

`FulfilResult = { status: "fulfilled" | "already_paid" | "not_found" | "unverified"; bookingReference?: string }`.
Hard failures (e.g. `confirmPayment` rejects) propagate as a thrown error so the
caller can return 500 and let Stripe retry.

### Caller 1 — `/api/webhooks/payment-complete` (mock; behavior preserved)

Becomes a thin wrapper: rate-limit + zod parse, then `fulfilBooking(session_id)`,
mapping the result to its existing status codes so current tests stay green:
- `unverified` → 400 `Payment verification failed`
- `not_found` → 404 `Booking not found`
- `already_paid` → 200 `{ success: true, already_processed: true }`
- `fulfilled` → 200 `{ success: true, bookingReference }`
- thrown → 500 `Failed to confirm booking`

### Caller 2 — `/api/webhooks/stripe` (the fix)

In the `checkout.session.completed` case, branch on `mode`:

```ts
case "checkout.session.completed":
  if (event.data.mode === "payment") await fulfilBooking(event.data.id); // one-off booking
  else                               await handleCheckoutCompleted(event, db); // membership
  break;
```

The booking is located by **session id** (`event.data.id`), which the booking
flow already stored via `repo.updateCheckoutSession` at creation;
`client_reference_id` is not needed for fulfilment. Soft outcomes return 200
(ack, no retry storm) and are logged; a thrown hard failure returns 500.

### Envelope change — `CheckoutSessionData.mode`

Add `mode: "payment" | "subscription"` to `CheckoutSessionData` (`types.ts`) and
populate it in `StripeGateway.normalizeEvent` from the retrieved session's `mode`.
Makes the booking-vs-membership branch explicit rather than inferred from
`subscription == null`.

## Error handling & idempotency

- Re-delivered events short-circuit on `payment_status === "paid"`.
- Soft outcomes → 200; hard `confirmPayment` failure → 500 (Stripe retries).
- Member-hours decrement and email sending remain non-fatal (logged), as today.

## Files

- **Create:** `src/lib/payment/booking-fulfilment.ts` (+ `__tests__/booking-fulfilment.test.ts`)
- **Modify:** `src/app/api/webhooks/payment-complete/route.ts` (delegate to shared fn)
- **Modify:** `src/app/api/webhooks/stripe/route.ts` (branch on `mode`)
- **Modify:** `src/lib/payment/types.ts` (+`mode` on `CheckoutSessionData`)
- **Modify:** `src/lib/payment/stripe-gateway.ts` (`normalizeEvent` sets `mode`)
- **Tests:** new fulfilment tests; update gateway mapping test; webhook route test for `mode=payment`

## TDD sequence

1. `fulfilBooking` unit tests (fulfilled / unverified / not_found / already_paid / hours decrement / confirm-throws) → implement the module.
2. Refactor `payment-complete` to delegate → existing route tests stay green.
3. Add `mode` to envelope + `normalizeEvent` → update mapping test.
4. Stripe webhook route test: signed `mode=payment` event fulfils the booking; `mode=subscription` still routes to membership.

## Verification

Local: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`, book a butler via the real Stripe checkout with test card `4242…`, confirm `checkout.session.completed` (mode=payment) marks the booking paid + sends the email. Subscription flow remains unaffected.
