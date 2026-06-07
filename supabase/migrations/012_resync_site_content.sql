-- 012_resync_site_content.sql
-- GENERATED from src/data/butler-page-configs.ts by scripts/gen-content-migration.ts.
-- Static config is the single source of truth; do NOT hand-edit the JSON below.
-- Regenerate: npx tsx scripts/gen-content-migration.ts > supabase/migrations/012_resync_site_content.sql
-- Why: site_content overrides butler-page-configs at render time (src/lib/content.ts).
-- The rows had drifted from static (stale risky examples, em dashes, £5,000 insurance),
-- so the cleaned static files never reached the reader. Bug-log 2026-06-07.
insert into site_content (page_slug, content)
values ('busy', $content${
  "hero": {
    "headline": "When time is of the essence.",
    "subheading": "For time-critical documents, urgent purchases, and last-minute deliveries where traditional courier and postal services will not suffice."
  },
  "trustIndicators": [
    "DBS checked and reference verified",
    "Insured for items up to £50,000",
    "Live GPS tracking on every delivery"
  ],
  "commonRequests": [
    "Contract signing across London, collected and delivered same afternoon",
    "Prescription collection from pharmacy when you're unwell",
    "Birthday gift delivery you forgot to order",
    "Queue standing for limited releases or ticket lines",
    "Keys collected from estate agent on moving day"
  ]
}$content$::jsonb)
on conflict (page_slug) do update set content = excluded.content, updated_at = now();
insert into site_content (page_slug, content)
values ('baby', $content${
  "hero": {
    "headline": "Trusted care. When life gets in the way.",
    "subheading": "For school runs, activity pickups, welfare checks for precious cargo… and when you can't be there yourself."
  },
  "trustIndicators": [
    "Enhanced DBS check verified Butlers",
    "Body-cam equipped for your peace of mind",
    "Real-time photo updates sent to you"
  ],
  "commonRequests": [
    "School pickup when an important meeting overruns",
    "Supervision between end of school and evening activity",
    "Welfare check on elderly parent who's not responding",
    "Airport drop-off for teenager travelling alone",
    "Accompany child to playdate or kids party",
    "Night Nurse support for overnight care",
    "Emergency childcare when regular arrangements fall through"
  ]
}$content$::jsonb)
on conflict (page_slug) do update set content = excluded.content, updated_at = now();
insert into site_content (page_slug, content)
values ('bougie', $content${
  "hero": {
    "headline": "A butler to secure the finer things in life.",
    "subheading": "For rare finds, exclusive reservations, and luxury experiences tailored to you."
  },
  "trustIndicators": [
    "Exclusive network access",
    "Vetted, discreet professionals",
    "5-star service guarantee"
  ],
  "commonRequests": [
    "Rare Scotch only sold in a tiny Highland shop, sourced and delivered",
    "Restaurant reservation research and booking support",
    "Private jet and private island bookings",
    "Custom gift curation for personal and corporate occasions",
    "Stand in arrangement at auction house",
    "Personalised luxury holiday planning and booking",
    "Personal shopper pick up and returns",
    "Coordinate groceries from multiple shops and deliver"
  ]
}$content$::jsonb)
on conflict (page_slug) do update set content = excluded.content, updated_at = now();
insert into site_content (page_slug, content)
values ('base', $content${
  "hero": {
    "headline": "Your home, handled. While you're away.",
    "subheading": "For deliveries, tradesmen, and property needs… whether you're home or away."
  },
  "trustIndicators": [
    "DBS checked and insured",
    "Body-cam available on request",
    "Secure key handling protocols"
  ],
  "commonRequests": [
    "Wait all day for a delivery with a 4-hour window",
    "Let in and supervise electrician or plumber",
    "Prepare rental property for new tenants",
    "Stock fridge and make beds before family arrival",
    "Plant watering and mail collection while on holiday",
    "Coordinate multiple tradesmen on renovation day"
  ]
}$content$::jsonb)
on conflict (page_slug) do update set content = excluded.content, updated_at = now();
insert into site_content (page_slug, content)
values ('budget', $content${
  "hero": {
    "headline": "For the more flexible client…",
    "subheading": "For tasks that need doing, but don't need doing today."
  },
  "trustIndicators": [
    "DBS checked, same standards",
    "Transparent pricing, no surprises",
    "Flexible scheduling saves you money"
  ],
  "commonRequests": [
    "Big weekly Costco shop delivered and unpacked",
    "Return online shopping to multiple stores",
    "Water plants and check on home weekly",
    "Charity shop drop-off of clothes and items",
    "Queue for non-urgent admin (post office, bank)",
    "Pick up dry cleaning on a flexible schedule"
  ]
}$content$::jsonb)
on conflict (page_slug) do update set content = excluded.content, updated_at = now();
insert into site_content (page_slug, content)
values ('bespoke', $content${
  "hero": {
    "headline": "Tell us what you need. We'll figure it out.",
    "subheading": "For those out of the box requests that require a personalised touch."
  },
  "trustIndicators": [
    "Senior butler assigned to complex requests",
    "Fully insured operations",
    "White-glove service standard"
  ],
  "commonRequests": [
    "Plan and execute a birthday dinner with personalised touches",
    "Manage entire house move: packing, transit, unpacking",
    "Gifts, organisation and presentation for Valentine's Day, birthdays, engagements, anniversaries, celebrations, and all other special events",
    "Multi-trip planning and booking, including flights, hotels, transport, itineraries and other services",
    "If you can describe it, consider it arranged"
  ]
}$content$::jsonb)
on conflict (page_slug) do update set content = excluded.content, updated_at = now();
