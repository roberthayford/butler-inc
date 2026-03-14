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
