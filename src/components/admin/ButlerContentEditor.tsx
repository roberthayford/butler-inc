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
