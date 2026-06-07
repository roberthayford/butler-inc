"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { butlerContentSchema } from "@/data/content-schema";
import { findCopyViolations } from "@/lib/content-policy";

export async function updateButlerContent(slug: string, rawContent: unknown) {
  const supabase = await createClient();

  // Verify the user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Validate content shape
  const parsed = butlerContentSchema.safeParse(rawContent);
  if (!parsed.success) {
    return { error: parsed.error.message };
  }

  // Enforce the customer-facing copy policy (no em dashes) before persisting.
  // site_content overrides the static config at render time, so this is the
  // only guard between an admin edit and what the reader sees.
  const violations = findCopyViolations(parsed.data);
  if (violations.length > 0) {
    return { error: violations.join(" ") };
  }

  const { error } = await supabase
    .from("site_content")
    .update({
      content: parsed.data,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq("page_slug", slug);

  if (error) {
    return { error: error.message };
  }

  // Purge cached page so visitors see the update
  revalidatePath(`/butlers/${slug}`);
  revalidatePath("/butlers");
  revalidatePath("/admin");

  return { success: true };
}
