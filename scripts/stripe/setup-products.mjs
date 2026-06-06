// Idempotent Stripe setup: creates (or reuses) the 3 membership products +
// recurring GBP prices and a Billing Portal configuration, then prints the
// STRIPE_PRICE_* env lines to stdout for copy-paste into your environment.
//
// Run against TEST keys first, then re-run against LIVE keys when going live:
//   npm run stripe:setup                       # uses .env.local via --env-file
//   STRIPE_SECRET_KEY=sk_test_... node scripts/stripe/setup-products.mjs
//
// Idempotency: products are matched by metadata.butlers_tier; prices are
// immutable, so an exact (currency+interval+amount) match is reused rather than
// recreated. Safe to run repeatedly.
//
// Amounts mirror src/data/membership-config.ts (monthlyPrice, in pounds). Keep
// the two in sync if pricing changes.

import Stripe from "stripe";

const API_VERSION = "2026-05-27.dahlia";

const TIERS = [
  { slug: "lite", name: "Lite", amount: 50000 }, // £500.00 in pence
  { slug: "frequent", name: "Frequent", amount: 100000 }, // £1,000.00
  { slug: "pro", name: "Pro", amount: 250000 }, // £2,500.00
];

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error(
    "STRIPE_SECRET_KEY is required. Set it in .env.local (test key) or export it before running."
  );
  process.exit(1);
}

const stripe = new Stripe(key, { apiVersion: API_VERSION });
const mode = key.startsWith("sk_live") ? "LIVE" : "TEST";
const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://butlersinc.com").replace(
  /\/$/,
  ""
);

async function findOrCreateProduct(tier) {
  const found = await stripe.products.search({
    query: `metadata['butlers_tier']:'${tier.slug}'`,
  });
  const active = found.data.find((p) => p.active);
  if (active) return active;
  return stripe.products.create({
    name: `Butlers ${tier.name} Membership`,
    metadata: { butlers_tier: tier.slug },
  });
}

async function findOrCreatePrice(product, tier) {
  const prices = await stripe.prices.list({
    product: product.id,
    active: true,
    limit: 100,
  });
  const match = prices.data.find(
    (p) =>
      p.currency === "gbp" &&
      p.unit_amount === tier.amount &&
      p.recurring?.interval === "month"
  );
  if (match) return match;
  return stripe.prices.create({
    product: product.id,
    currency: "gbp",
    unit_amount: tier.amount,
    recurring: { interval: "month" },
    metadata: { butlers_tier: tier.slug },
  });
}

async function ensurePortalConfiguration(items) {
  const params = {
    metadata: { butlers_managed: "true" },
    business_profile: {
      headline: "Butlers Inc. membership",
      privacy_policy_url: `${site}/privacy`,
      terms_of_service_url: `${site}/terms`,
    },
    features: {
      // Plan switching among the 3 tiers (powers PlanManager "change plan").
      subscription_update: {
        enabled: true,
        default_allowed_updates: ["price"],
        proration_behavior: "create_prorations",
        products: items.map(({ product, price }) => ({
          product: product.id,
          prices: [price.id],
        })),
      },
      subscription_cancel: { enabled: true, mode: "at_period_end" },
      payment_method_update: { enabled: true },
      invoice_history: { enabled: true },
      // Pause is driven by the app (pauseSubscription + /api/membership/pause
      // state machine), so the portal's own pause UI stays disabled.
    },
  };

  const list = await stripe.billingPortal.configurations.list({ limit: 100 });
  const existing = list.data.find((c) => c.metadata?.butlers_managed === "true");
  if (existing) {
    return stripe.billingPortal.configurations.update(existing.id, params);
  }
  return stripe.billingPortal.configurations.create(params);
}

async function main() {
  console.error(`Stripe setup running in ${mode} mode (API ${API_VERSION})`);
  const results = [];
  for (const tier of TIERS) {
    const product = await findOrCreateProduct(tier);
    const price = await findOrCreatePrice(product, tier);
    results.push({ tier, product, price });
    console.error(`  ✓ ${tier.name}: ${product.id} / ${price.id}`);
  }

  const portal = await ensurePortalConfiguration(results);
  console.error(`  ✓ Billing Portal configuration: ${portal.id}`);

  // Env lines to stdout (so `... > prices.env` captures only these).
  console.log("");
  for (const { tier, price } of results) {
    console.log(`STRIPE_PRICE_${tier.slug.toUpperCase()}=${price.id}`);
  }
}

main().catch((err) => {
  console.error("Stripe setup failed:", err?.message ?? err);
  process.exit(1);
});
