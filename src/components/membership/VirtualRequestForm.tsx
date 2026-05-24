"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { VIRTUAL_TASK_CATEGORIES } from "@/data/membership-config";
import type { VirtualTaskCategory } from "@/types/membership";

interface VirtualRequestFormData {
  category: VirtualTaskCategory;
  description: string;
  preferredDate: string;
  preferredTime: string;
}

interface VirtualRequestFormProps {
  onSubmit: (data: VirtualRequestFormData) => void;
  isSubmitting: boolean;
}

export function VirtualRequestForm({ onSubmit, isSubmitting }: VirtualRequestFormProps) {
  const [category, setCategory] = useState<VirtualTaskCategory>("appointment");
  const [description, setDescription] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");

  const canSubmit = description.trim().length > 0 && !isSubmitting;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({ category, description, preferredDate, preferredTime });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Category selector */}
      <div>
        <label className="block text-sm font-medium text-optical-white mb-2">Category</label>
        <div className="grid grid-cols-2 gap-2">
          {VIRTUAL_TASK_CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setCategory(cat.key)}
              className={`p-3 rounded-sm border text-left transition-colors ${
                category === cat.key
                  ? "border-brass/60 bg-brass/10 text-optical-white"
                  : "border-primary-foreground/10 bg-primary-foreground/5 text-warm-gray hover:border-primary-foreground/20"
              }`}
            >
              <p className="text-sm font-medium">{cat.label}</p>
              <p className="text-xs mt-0.5 opacity-70">{cat.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="vb-description" className="block text-sm font-medium text-optical-white mb-1">
          Describe your request
        </label>
        <textarea
          id="vb-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="Describe what you need your virtual butler to do..."
          className="w-full bg-primary-foreground/5 border border-primary-foreground/10 rounded-sm p-3 text-optical-white placeholder:text-warm-gray/50 focus:border-brass/40 focus:outline-none"
        />
      </div>

      {/* Date and Time (optional) */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="vb-date" className="block text-sm font-medium text-optical-white mb-1">
            Preferred Date
          </label>
          <input
            id="vb-date"
            type="date"
            value={preferredDate}
            onChange={(e) => setPreferredDate(e.target.value)}
            className="w-full bg-primary-foreground/5 border border-primary-foreground/10 rounded-sm p-2 text-optical-white focus:border-brass/40 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="vb-time" className="block text-sm font-medium text-optical-white mb-1">
            Preferred Time
          </label>
          <input
            id="vb-time"
            type="time"
            value={preferredTime}
            onChange={(e) => setPreferredTime(e.target.value)}
            className="w-full bg-primary-foreground/5 border border-primary-foreground/10 rounded-sm p-2 text-optical-white focus:border-brass/40 focus:outline-none"
          />
        </div>
      </div>

      {/* Submit */}
      <Button
        type="submit"
        disabled={!canSubmit}
        className="w-full bg-brass text-charcoal hover:bg-brass-muted disabled:opacity-50"
      >
        {isSubmitting ? "Submitting..." : "Submit Request"}
      </Button>
    </form>
  );
}
