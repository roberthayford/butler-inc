import { describe, expect, it } from "vitest";
import { butlerPageConfigs } from "../butler-page-configs";
import type { ServiceId } from "../services";

/**
 * site_content drift guard.
 *
 * The live butler pages serve hero/trustIndicators/commonRequests from the
 * Supabase `site_content` table, which is (re)seeded from these static configs
 * (see scripts/seed-content.ts and supabase/migrations/012_*). Static is the
 * single source of truth; this test guards the content that WILL be seeded so a
 * stale or non-compliant value can never silently reach the reader.
 *
 * Mirrors the exact blob shape produced by seed-content.ts.
 */
const BUTLER_IDS: ServiceId[] = [
  "busy",
  "baby",
  "bougie",
  "base",
  "budget",
  "bespoke",
];

function seedBlob(id: ServiceId) {
  const config = butlerPageConfigs[id];
  return {
    hero: {
      headline: config.hero.headline,
      subheading: config.hero.subheading,
    },
    trustIndicators: config.trustIndicators.map((t) => t.text),
    commonRequests: config.commonRequests,
  };
}

function seedText(id: ServiceId): string {
  return JSON.stringify(seedBlob(id));
}

function allSeedText(): string {
  return JSON.stringify(BUTLER_IDS.map(seedBlob));
}

describe("site_content seed (static source of truth)", () => {
  it("contains no em dashes in any seeded butler copy", () => {
    // The #1 customer-facing copy rule. The DB overrides previously carried em
    // dashes because the static cleanup never reached the data layer.
    for (const id of BUTLER_IDS) {
      expect(seedText(id), `${id} seed must not contain em dashes`).not.toContain(
        "—"
      );
    }
  });

  it("does not re-introduce removed high-risk or stale examples", () => {
    const text = allSeedText();
    const forbidden = [
      "fully-booked Michelin",
      "fully booked Michelin",
      "sold-out West End",
      "high-net-worth",
      "high net worth",
      "Private viewing arrangements",
      "Important documents from solicitor to client",
      "Urgent shopping",
      "medical appointment",
      "£5,000",
    ];
    for (const phrase of forbidden) {
      expect(text, `seed must not contain "${phrase}"`).not.toContain(phrase);
    }
  });

  it("keeps Busy Butler insured for items up to £50,000", () => {
    expect(seedText("busy")).toContain("Insured for items up to £50,000");
  });

  it("includes the new Bougie Butler common request", () => {
    expect(seedText("bougie")).toContain(
      "Coordinate groceries from multiple shops and deliver"
    );
  });

  it("includes the new Bespoke Butler common requests and drops the removed ones", () => {
    const text = seedText("bespoke");
    expect(text).toContain(
      "Gifts, organisation and presentation for Valentine's Day"
    );
    expect(text).toContain(
      "Multi-trip planning and booking, including flights, hotels, transport, itineraries and other services"
    );
    // Removed per Farida 6 Jun (01, 03, 05)
    expect(text).not.toContain("Surprise delivery of flowers, chocolates");
    expect(text).not.toContain(
      "Complex multi-vendor coordination for a wedding anniversary"
    );
    expect(text).not.toContain("Source and install home office setup");
  });
});
