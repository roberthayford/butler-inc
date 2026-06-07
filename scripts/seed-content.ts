/**
 * Seeds/re-syncs the Supabase `site_content` rows from the static butler
 * configs. `src/data/butler-page-configs.ts` is the SINGLE SOURCE OF TRUTH for
 * butler hero/trustIndicators/commonRequests — the live site serves these from
 * `site_content` (overriding static at render time, see src/lib/content.ts), so
 * the DB must be kept in sync with static. The admin content editor introduces
 * drift; reconcile by re-running this (or applying the generated migration).
 * The `site-content-drift.test.ts` guard fails if static carries forbidden copy.
 */
import { createClient } from "@supabase/supabase-js";
import { butlerPageConfigs } from "../src/data/butler-page-configs";
import type { ServiceId } from "../src/data/services";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BUTLER_IDS: ServiceId[] = ["busy", "baby", "bougie", "base", "budget", "bespoke"];

async function seed() {
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

    const { error } = await supabase.from("site_content").upsert(
      { page_slug: id, content },
      { onConflict: "page_slug" }
    );

    if (error) {
      console.error(`Failed to seed ${id}:`, error.message);
    } else {
      console.log(`Seeded: ${id}`);
    }
  }
}

seed();
