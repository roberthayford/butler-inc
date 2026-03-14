"use client";

import { useState } from "react";
import { useAllContent } from "@/hooks/use-site-content";
import { ButlerContentEditor } from "./ButlerContentEditor";

const BUTLER_LABELS: Record<string, string> = {
  baby: "Baby Butler",
  base: "Base Butler",
  bespoke: "Bespoke Butler",
  bougie: "Bougie Butler",
  budget: "Budget Butler",
  busy: "Busy Butler",
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
