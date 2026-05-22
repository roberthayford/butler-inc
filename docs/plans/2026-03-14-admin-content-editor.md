# Admin Content Editor — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Give Farida a web-based admin panel to edit butler page copy (headlines, subheadings, trust indicators, common requests) without touching code.

**Architecture:** Supabase `site_content` table stores editable content as JSONB per butler. A protected `/admin` route renders an accordion-style editor with auto-resizing text areas. Butler detail pages read from Supabase first, falling back to static TS data. Server Actions handle saves with `revalidatePath` for instant updates.

**Tech Stack:** Next.js 16 (App Router), Supabase (JSONB + RLS), React Query 5 (optimistic updates), Zod 4 (validation), Server Actions (revalidation)

**Package Updates (pre-requisite):**
- `@supabase/ssr`: ^0.8.0 → ^0.9.0
- `react`: 19.2.3 → 19.2.4
- `react-dom`: 19.2.3 → 19.2.4

---

### Task 1: Update Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Bump package versions**

```bash
npm install @supabase/ssr@^0.9.0 react@19.2.4 react-dom@19.2.4
```

**Step 2: Verify build passes**

```bash
npx next build
```

Expected: Clean build, no errors.

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: bump @supabase/ssr to 0.9, react to 19.2.4"
```

---

### Task 2: Create Supabase `site_content` Table and RLS Policies

**Files:**
- Create: `supabase/migrations/001_site_content.sql`

**Step 1: Write the migration SQL**

```sql
-- Site content table for editable page copy
create table if not exists site_content (
  id uuid primary key default gen_random_uuid(),
  page_slug text unique not null,
  content jsonb not null default '{}',
  updated_at timestamptz default now(),
  updated_by uuid references auth.users(id)
);

-- Enable RLS
alter table site_content enable row level security;

-- Anyone can read (public site needs content)
create policy "Public read access"
  on site_content for select
  using (true);

-- Only admin can insert
create policy "Admin insert"
  on site_content for insert
  to authenticated
  with check (
    (select auth.uid()) = (select id from auth.users where email = 'farida@butlersinc.co.uk' limit 1)
  );

-- Only admin can update
create policy "Admin update"
  on site_content for update
  to authenticated
  using (
    (select auth.uid()) = (select id from auth.users where email = 'farida@butlersinc.co.uk' limit 1)
  )
  with check (
    (select auth.uid()) = (select id from auth.users where email = 'farida@butlersinc.co.uk' limit 1)
  );

-- Only admin can delete
create policy "Admin delete"
  on site_content for delete
  to authenticated
  using (
    (select auth.uid()) = (select id from auth.users where email = 'farida@butlersinc.co.uk' limit 1)
  );

-- Index for fast slug lookups
create index idx_site_content_slug on site_content(page_slug);
```

**Step 2: Run migration in Supabase**

Run the SQL via Supabase Dashboard → SQL Editor, or via CLI:

```bash
supabase db push
```

**Step 3: Commit**

```bash
git add supabase/
git commit -m "feat: add site_content table with RLS for admin editing"
```

> **Note:** Replace `farida@butlersinc.co.uk` with Farida's actual Supabase auth email. If she doesn't have an account yet, create one first via the signup flow.

---

### Task 3: Create Zod Schema for Content Validation

**Files:**
- Create: `src/data/content-schema.ts`
- Test: `src/data/__tests__/content-schema.test.ts`

**Step 1: Write the failing test**

```typescript
// src/data/__tests__/content-schema.test.ts
import { describe, it, expect } from "vitest";
import { butlerContentSchema } from "../content-schema";

describe("butlerContentSchema", () => {
  it("validates valid butler content", () => {
    const valid = {
      hero: {
        headline: "When time is of the essence.",
        subheading: "For time-critical documents.",
      },
      trustIndicators: ["DBS checked", "Insured"],
      commonRequests: ["Contract delivery", "Prescription pickup"],
    };
    expect(butlerContentSchema.parse(valid)).toEqual(valid);
  });

  it("rejects empty headline", () => {
    const invalid = {
      hero: { headline: "", subheading: "Some text" },
      trustIndicators: [],
      commonRequests: [],
    };
    expect(() => butlerContentSchema.parse(invalid)).toThrow();
  });

  it("rejects missing fields", () => {
    expect(() => butlerContentSchema.parse({})).toThrow();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/data/__tests__/content-schema.test.ts
```

Expected: FAIL — module not found.

**Step 3: Write the schema**

```typescript
// src/data/content-schema.ts
import { z } from "zod/v4";

export const butlerContentSchema = z.object({
  hero: z.object({
    headline: z.string().min(1, "Headline is required"),
    subheading: z.string().min(1, "Subheading is required"),
  }),
  trustIndicators: z.array(z.string()),
  commonRequests: z.array(z.string()),
});

export type ButlerContent = z.infer<typeof butlerContentSchema>;
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run src/data/__tests__/content-schema.test.ts
```

Expected: PASS — 3 tests.

**Step 5: Commit**

```bash
git add src/data/content-schema.ts src/data/__tests__/content-schema.test.ts
git commit -m "feat: add Zod schema for butler page content validation"
```

---

### Task 4: Create Content Fetching with Fallback

**Files:**
- Create: `src/lib/content.ts`
- Test: `src/lib/__tests__/content.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/__tests__/content.test.ts
import { describe, it, expect, vi } from "vitest";
import { mergeContent } from "../content";

describe("mergeContent", () => {
  it("returns Supabase content when available", () => {
    const supabaseContent = {
      hero: { headline: "Custom headline", subheading: "Custom sub" },
      trustIndicators: ["Custom trust"],
      commonRequests: ["Custom request"],
    };
    const fallback = {
      hero: { headline: "Fallback", subheading: "Fallback sub" },
      trustIndicators: [{ text: "Fallback trust" }],
      commonRequests: ["Fallback request"],
    };

    const result = mergeContent(supabaseContent, fallback);
    expect(result.hero.headline).toBe("Custom headline");
    expect(result.trustIndicators).toEqual([{ text: "Custom trust" }]);
  });

  it("returns fallback when Supabase content is null", () => {
    const fallback = {
      hero: { headline: "Fallback", subheading: "Fallback sub" },
      trustIndicators: [{ text: "Fallback trust" }],
      commonRequests: ["Fallback request"],
    };

    const result = mergeContent(null, fallback);
    expect(result.hero.headline).toBe("Fallback");
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/__tests__/content.test.ts
```

Expected: FAIL — module not found.

**Step 3: Write the content helper**

```typescript
// src/lib/content.ts
import type { ButlerContent } from "@/data/content-schema";
import type { ButlerPageConfig } from "@/data/butler-page-configs";

/**
 * Merges Supabase content over static fallback config.
 * Transforms flat trustIndicators strings into { text } objects
 * to match the existing ButlerPageConfig shape.
 */
export function mergeContent(
  supabaseContent: ButlerContent | null,
  fallback: ButlerPageConfig
): ButlerPageConfig {
  if (!supabaseContent) return fallback;

  return {
    ...fallback,
    hero: {
      ...fallback.hero,
      headline: supabaseContent.hero.headline,
      subheading: supabaseContent.hero.subheading,
    },
    trustIndicators: supabaseContent.trustIndicators.map((text) => ({ text })),
    commonRequests: supabaseContent.commonRequests,
  };
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run src/lib/__tests__/content.test.ts
```

Expected: PASS — 2 tests.

**Step 5: Commit**

```bash
git add src/lib/content.ts src/lib/__tests__/content.test.ts
git commit -m "feat: add content merge helper with Supabase-over-fallback pattern"
```

---

### Task 5: Wire Butler Detail Pages to Supabase Content

**Files:**
- Modify: `src/app/butlers/[id]/page.tsx`

**Step 1: Add Supabase content fetch with fallback**

At the top of the `ButlerPage` component, after getting `config` from static data:

```typescript
import { createClient } from "@/lib/supabase/server";
import { mergeContent } from "@/lib/content";

// Inside ButlerPage, after line: const config = butlerPageConfigs[serviceId];
const supabase = await createClient();
const { data: contentRow } = await supabase
  .from("site_content")
  .select("content")
  .eq("page_slug", serviceId)
  .single();

const content = mergeContent(contentRow?.content ?? null, config);
```

Then replace all references to `config.hero`, `config.trustIndicators`, and `config.commonRequests` with `content.hero`, `content.trustIndicators`, and `content.commonRequests`. Keep `config` for non-editable fields (seo, howItWorks, accentColor).

**Step 2: Verify build passes**

```bash
npx next build
```

Expected: Clean build with all 6 butler static paths generated.

**Step 3: Test manually**

Visit `/butlers/busy` — should display same content as before (Supabase table is empty, fallback kicks in).

**Step 4: Commit**

```bash
git add src/app/butlers/\[id\]/page.tsx
git commit -m "feat: butler pages read editable content from Supabase with static fallback"
```

---

### Task 6: Create Seed Script for Initial Content

**Files:**
- Create: `scripts/seed-content.ts`

**Step 1: Write the seed script**

```typescript
// scripts/seed-content.ts
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
```

**Step 2: Run the seed**

```bash
npx tsx scripts/seed-content.ts
```

Expected: "Seeded: busy", "Seeded: baby", etc. for all 6.

**Step 3: Verify in Supabase Dashboard**

Check `site_content` table — should have 6 rows with correct JSONB content.

**Step 4: Commit**

```bash
git add scripts/seed-content.ts
git commit -m "feat: add seed script to populate site_content from static configs"
```

---

### Task 7: Create Server Action for Content Updates

**Files:**
- Create: `src/app/admin/actions.ts`

**Step 1: Write the server action**

```typescript
// src/app/admin/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { butlerContentSchema } from "@/data/content-schema";

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
```

**Step 2: Commit**

```bash
git add src/app/admin/actions.ts
git commit -m "feat: add server action for admin content updates with validation"
```

---

### Task 8: Create React Query Hooks for Admin Panel

**Files:**
- Create: `src/hooks/use-site-content.ts`

**Step 1: Write the hooks**

```typescript
// src/hooks/use-site-content.ts
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { updateButlerContent } from "@/app/admin/actions";
import type { ButlerContent } from "@/data/content-schema";

interface SiteContentRow {
  page_slug: string;
  content: ButlerContent;
  updated_at: string;
}

export function useAllContent() {
  const supabase = createClient();

  return useQuery({
    queryKey: ["site-content"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_content")
        .select("page_slug, content, updated_at")
        .order("page_slug");

      if (error) throw error;
      return data as SiteContentRow[];
    },
  });
}

export function useUpdateContent(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (content: ButlerContent) => {
      const result = await updateButlerContent(slug, content);
      if (result.error) throw new Error(result.error);
      return result;
    },

    onMutate: async (newContent) => {
      await queryClient.cancelQueries({ queryKey: ["site-content"] });
      const previous = queryClient.getQueryData<SiteContentRow[]>(["site-content"]);

      queryClient.setQueryData<SiteContentRow[]>(["site-content"], (old) =>
        old?.map((row) =>
          row.page_slug === slug ? { ...row, content: newContent } : row
        )
      );

      return { previous };
    },

    onError: (_err, _newContent, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["site-content"], context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["site-content"] });
    },
  });
}
```

**Step 2: Commit**

```bash
git add src/hooks/use-site-content.ts
git commit -m "feat: add React Query hooks for site content with optimistic updates"
```

---

### Task 9: Build the Admin Editor Page

**Files:**
- Create: `src/app/admin/page.tsx`
- Create: `src/components/admin/ButlerContentEditor.tsx`

**Step 1: Create the admin page (server component for auth check)**

```typescript
// src/app/admin/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminEditor } from "@/components/admin/AdminEditor";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/members/login");
  }

  return (
    <div className="min-h-screen bg-charcoal">
      <header className="pt-8 pb-6 px-6 border-b border-primary-foreground/10">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-serif font-bold text-optical-white">
            Content Editor
          </h1>
          <p className="text-warm-gray text-sm mt-1">
            Edit butler page headlines, descriptions, and details.
          </p>
        </div>
      </header>
      <main className="px-6 py-8">
        <div className="max-w-3xl mx-auto">
          <AdminEditor />
        </div>
      </main>
    </div>
  );
}
```

**Step 2: Create the client-side editor component**

```typescript
// src/components/admin/AdminEditor.tsx
"use client";

import { useState } from "react";
import { useAllContent } from "@/hooks/use-site-content";
import { ButlerContentEditor } from "./ButlerContentEditor";

const BUTLER_LABELS: Record<string, string> = {
  busy: "Busy Butler",
  baby: "Baby Butler",
  bougie: "Bougie Butler",
  base: "Base Butler",
  budget: "Budget Butler",
  bespoke: "Bespoke Butler",
};

export function AdminEditor() {
  const { data: rows, isLoading, error } = useAllContent();
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-14 bg-primary-foreground/5 rounded-sm animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-red-400 text-sm">
        Failed to load content: {error.message}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {rows?.map((row) => (
        <div
          key={row.page_slug}
          className="border border-primary-foreground/10 rounded-sm overflow-hidden"
        >
          <button
            onClick={() =>
              setExpandedSlug(
                expandedSlug === row.page_slug ? null : row.page_slug
              )
            }
            className="w-full flex items-center justify-between p-4 text-left hover:bg-primary-foreground/5 transition-colors"
          >
            <span className="text-lg font-serif font-semibold text-optical-white">
              {BUTLER_LABELS[row.page_slug] ?? row.page_slug}
            </span>
            <span className="text-warm-gray text-xs">
              {expandedSlug === row.page_slug ? "Collapse" : "Edit"}
            </span>
          </button>

          {expandedSlug === row.page_slug && (
            <ButlerContentEditor
              slug={row.page_slug}
              content={row.content}
            />
          )}
        </div>
      ))}
    </div>
  );
}
```

**Step 3: Create the per-butler editor form**

```typescript
// src/components/admin/ButlerContentEditor.tsx
"use client";

import { useState, useCallback } from "react";
import { useUpdateContent } from "@/hooks/use-site-content";
import { toast } from "sonner";
import type { ButlerContent } from "@/data/content-schema";

interface Props {
  slug: string;
  content: ButlerContent;
}

export function ButlerContentEditor({ slug, content }: Props) {
  const [draft, setDraft] = useState<ButlerContent>(content);
  const mutation = useUpdateContent(slug);

  const hasChanges = JSON.stringify(draft) !== JSON.stringify(content);

  const updateHero = useCallback(
    (field: "headline" | "subheading", value: string) => {
      setDraft((prev) => ({
        ...prev,
        hero: { ...prev.hero, [field]: value },
      }));
    },
    []
  );

  const updateListItem = useCallback(
    (
      list: "trustIndicators" | "commonRequests",
      index: number,
      value: string
    ) => {
      setDraft((prev) => ({
        ...prev,
        [list]: prev[list].map((item, i) => (i === index ? value : item)),
      }));
    },
    []
  );

  const removeListItem = useCallback(
    (list: "trustIndicators" | "commonRequests", index: number) => {
      setDraft((prev) => ({
        ...prev,
        [list]: prev[list].filter((_, i) => i !== index),
      }));
    },
    []
  );

  const addListItem = useCallback(
    (list: "trustIndicators" | "commonRequests") => {
      setDraft((prev) => ({
        ...prev,
        [list]: [...prev[list], ""],
      }));
    },
    []
  );

  const handleSave = () => {
    mutation.mutate(draft, {
      onSuccess: () => toast.success("Content saved"),
      onError: (err) => toast.error(err.message),
    });
  };

  const handleRevert = () => {
    setDraft(content);
  };

  return (
    <div className="p-4 pt-0 space-y-6">
      {/* Hero fields */}
      <fieldset className="space-y-3">
        <legend className="text-xs uppercase tracking-widest text-warm-gray mb-2">
          Hero
        </legend>
        <div>
          <label className="text-xs text-warm-gray/70 block mb-1">
            Headline ({draft.hero.headline.length} chars)
          </label>
          <input
            type="text"
            value={draft.hero.headline}
            onChange={(e) => updateHero("headline", e.target.value)}
            className="w-full bg-primary-foreground/5 border border-primary-foreground/10 rounded-sm px-3 py-2 text-optical-white text-sm focus:outline-none focus:border-brass/50"
          />
        </div>
        <div>
          <label className="text-xs text-warm-gray/70 block mb-1">
            Subheading ({draft.hero.subheading.length} chars)
          </label>
          <textarea
            value={draft.hero.subheading}
            onChange={(e) => updateHero("subheading", e.target.value)}
            rows={3}
            className="w-full bg-primary-foreground/5 border border-primary-foreground/10 rounded-sm px-3 py-2 text-optical-white text-sm focus:outline-none focus:border-brass/50 resize-y"
          />
        </div>
      </fieldset>

      {/* Trust Indicators */}
      <fieldset className="space-y-2">
        <legend className="text-xs uppercase tracking-widest text-warm-gray mb-2">
          Trust Indicators
        </legend>
        {draft.trustIndicators.map((item, i) => (
          <div key={i} className="flex gap-2">
            <input
              type="text"
              value={item}
              onChange={(e) =>
                updateListItem("trustIndicators", i, e.target.value)
              }
              className="flex-1 bg-primary-foreground/5 border border-primary-foreground/10 rounded-sm px-3 py-2 text-optical-white text-sm focus:outline-none focus:border-brass/50"
            />
            <button
              type="button"
              onClick={() => removeListItem("trustIndicators", i)}
              className="px-2 text-warm-gray/50 hover:text-red-400 transition-colors text-sm"
              aria-label="Remove"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => addListItem("trustIndicators")}
          className="text-xs text-brass-text hover:text-brass-text/80 transition-colors"
        >
          + Add indicator
        </button>
      </fieldset>

      {/* Common Requests */}
      <fieldset className="space-y-2">
        <legend className="text-xs uppercase tracking-widest text-warm-gray mb-2">
          Common Requests
        </legend>
        {draft.commonRequests.map((item, i) => (
          <div key={i} className="flex gap-2">
            <input
              type="text"
              value={item}
              onChange={(e) =>
                updateListItem("commonRequests", i, e.target.value)
              }
              className="flex-1 bg-primary-foreground/5 border border-primary-foreground/10 rounded-sm px-3 py-2 text-optical-white text-sm focus:outline-none focus:border-brass/50"
            />
            <button
              type="button"
              onClick={() => removeListItem("commonRequests", i)}
              className="px-2 text-warm-gray/50 hover:text-red-400 transition-colors text-sm"
              aria-label="Remove"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => addListItem("commonRequests")}
          className="text-xs text-brass-text hover:text-brass-text/80 transition-colors"
        >
          + Add request
        </button>
      </fieldset>

      {/* Action buttons */}
      <div className="flex items-center gap-3 pt-2 border-t border-primary-foreground/10">
        <button
          onClick={handleSave}
          disabled={!hasChanges || mutation.isPending}
          className="px-4 py-2 text-sm font-medium bg-brass text-charcoal rounded-sm hover:bg-brass-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {mutation.isPending ? "Saving..." : "Save Changes"}
        </button>
        <button
          onClick={handleRevert}
          disabled={!hasChanges}
          className="px-4 py-2 text-sm text-warm-gray hover:text-optical-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Revert
        </button>
        {!hasChanges && (
          <span className="text-xs text-warm-gray/50 ml-auto">
            No unsaved changes
          </span>
        )}
      </div>
    </div>
  );
}
```

**Step 4: Verify build passes**

```bash
npx next build
```

Expected: Clean build.

**Step 5: Commit**

```bash
git add src/app/admin/ src/components/admin/
git commit -m "feat: add admin content editor with accordion UI and optimistic updates"
```

---

### Task 10: Protect Admin Route via Middleware

**Files:**
- Modify: `middleware.ts`

**Step 1: Add `/admin` to protected routes**

The existing middleware protects `/members/:path*`. Extend the matcher to also cover `/admin/:path*`:

```typescript
// In middleware.ts, update the config.matcher array:
export const config = {
  matcher: ["/members/:path*", "/admin/:path*"],
};
```

**Step 2: Verify build passes**

```bash
npx next build
```

**Step 3: Commit**

```bash
git add middleware.ts
git commit -m "feat: protect /admin route via middleware auth check"
```

---

### Task 11: Add Admin Link to Header (for authenticated admin user)

**Files:**
- Modify: `src/components/landing/Header.tsx`

**Step 1: Add admin link in the authenticated user section**

In the desktop nav, after the Dashboard link for authenticated users, and in the mobile menu:

```typescript
// Desktop nav — inside the `user ?` branch, after the Dashboard link:
<Link
  href="/admin"
  className="text-optical-white/80 hover:text-optical-white transition-colors text-sm"
>
  Edit Content
</Link>

// Mobile menu — same pattern, inside the authenticated user branch
```

> **Note:** This link will be visible to all authenticated users but the RLS policy ensures only Farida can actually edit. For a cleaner UX, we could conditionally show it based on email, but the RLS is the real security boundary.

**Step 2: Commit**

```bash
git add src/components/landing/Header.tsx
git commit -m "feat: add Edit Content link to header for authenticated users"
```

---

### Task 12: End-to-End Manual Testing

**Step 1: Start dev server**

```bash
npm run dev
```

**Step 2: Test fallback (no Supabase content)**

- Delete all rows from `site_content` table
- Visit `/butlers/busy` — should show static config content
- Verify no errors in console

**Step 3: Test seeded content**

```bash
npx tsx scripts/seed-content.ts
```

- Refresh `/butlers/busy` — should show same content (now from Supabase)

**Step 4: Test admin editor**

- Log in as Farida
- Visit `/admin`
- Expand "Busy Butler"
- Change headline to "TEST HEADLINE"
- Click "Save Changes"
- Verify toast appears
- Visit `/butlers/busy` — should show "TEST HEADLINE"
- Go back to `/admin`, click "Revert" — verify original headline restores

**Step 5: Test unauthorized access**

- Log in as a different user
- Visit `/admin` — should see the editor but saving should fail (RLS)
- Verify error toast appears

**Step 6: Test mobile**

- Open `/admin` on mobile viewport
- Verify accordion and form fields are usable

---

## Summary

| Task | What | Estimated Steps |
|------|------|----------------|
| 1 | Update dependencies | 3 |
| 2 | Supabase table + RLS | 3 |
| 3 | Zod content schema | 5 |
| 4 | Content merge helper | 5 |
| 5 | Wire butler pages to Supabase | 4 |
| 6 | Seed script | 4 |
| 7 | Server action for updates | 2 |
| 8 | React Query hooks | 2 |
| 9 | Admin editor UI | 5 |
| 10 | Middleware protection | 3 |
| 11 | Header admin link | 2 |
| 12 | E2E manual testing | 6 |
| **Total** | | **44 steps** |
