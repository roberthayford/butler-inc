/**
 * Generates a site_content re-sync migration from the static butler configs.
 *
 * Static config (`src/data/butler-page-configs.ts`) is the single source of
 * truth for butler hero/trustIndicators/commonRequests. The live site serves
 * these from the Supabase `site_content` table, which can drift from static
 * (it previously carried stale risky examples, em dashes, and £5,000 insurance).
 *
 * This script emits an idempotent upsert per butler so the DB is brought back
 * in line with static. Do NOT hand-edit the generated JSON; edit the static
 * config and regenerate:
 *
 *   npx tsx scripts/gen-content-migration.ts > supabase/migrations/012_resync_site_content.sql
 */
import { butlerPageConfigs } from "../src/data/butler-page-configs";
import type { ServiceId } from "../src/data/services";

const BUTLER_IDS: ServiceId[] = [
  "busy",
  "baby",
  "bougie",
  "base",
  "budget",
  "bespoke",
];

const out: string[] = [];
out.push("-- 012_resync_site_content.sql");
out.push(
  "-- GENERATED from src/data/butler-page-configs.ts by scripts/gen-content-migration.ts."
);
out.push(
  "-- Static config is the single source of truth; do NOT hand-edit the JSON below."
);
out.push(
  "-- Regenerate: npx tsx scripts/gen-content-migration.ts > supabase/migrations/012_resync_site_content.sql"
);
out.push(
  "-- Why: site_content overrides butler-page-configs at render time (src/lib/content.ts)."
);
out.push(
  "-- The rows had drifted from static (stale risky examples, em dashes, £5,000 insurance),"
);
out.push("-- so the cleaned static files never reached the reader. Bug-log 2026-06-07.");
out.push("");

for (const id of BUTLER_IDS) {
  const config = butlerPageConfigs[id];
  const content = {
    hero: {
      headline: config.hero.headline,
      subheading: config.hero.subheading,
    },
    trustIndicators: config.trustIndicators.map((t) => t.text),
    commonRequests: config.commonRequests,
  };

  const json = JSON.stringify(content, null, 2);
  if (json.includes("—")) {
    throw new Error(`Refusing to emit: ${id} content contains an em dash`);
  }

  out.push(`insert into site_content (page_slug, content)`);
  out.push(`values ('${id}', $content$${json}$content$::jsonb)`);
  out.push(
    `on conflict (page_slug) do update set content = excluded.content, updated_at = now();`
  );
  out.push("");
}

process.stdout.write(out.join("\n"));
