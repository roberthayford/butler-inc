"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { BUTLER_TASKS, type ButlerTypeKey } from "@/data/butler-tasks";
import { Textarea } from "@/components/ui/textarea";

interface ServiceOptionSelectorProps {
  butlerType: ButlerTypeKey;
  onSelect: (taskId: string, customDescription?: string) => void;
}

export function ServiceOptionSelector({
  butlerType,
  onSelect,
}: ServiceOptionSelectorProps) {
  const tasks = BUTLER_TASKS[butlerType];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [customDescription, setCustomDescription] = useState("");

  const isBespoke = butlerType === "bespoke";

  if (isBespoke) {
    return (
      <div className="space-y-4">
        <h3 className="text-xl font-serif font-semibold text-optical-white">
          Describe your request
        </h3>
        <Textarea
          value={customDescription}
          onChange={(e) => setCustomDescription(e.target.value)}
          placeholder="Describe what you need in as much detail as possible..."
          className="min-h-[120px] bg-charcoal/50 border-primary-foreground/20 text-optical-white placeholder:text-warm-gray resize-none"
        />
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelect("bespoke", customDescription)}
          disabled={!customDescription.trim()}
          className="w-full py-3 rounded-sm bg-brass text-charcoal font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:bg-brass-muted"
        >
          Continue
        </motion.button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-serif font-semibold text-optical-white">
        What do you need?
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {tasks.map((task) => {
          const isSelected = selectedId === task.id;
          const isOther = task.id === "other";

          return (
            <motion.button
              key={task.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setSelectedId(task.id);
                if (!isOther) {
                  setCustomDescription("");
                  onSelect(task.id);
                }
              }}
              className={`
                p-4 rounded-sm text-left transition-all duration-200
                bg-primary-foreground/5 border backdrop-blur-sm
                ${
                  isSelected
                    ? "border-brass text-optical-white"
                    : "border-primary-foreground/10 text-warm-gray hover:border-primary-foreground/30 hover:text-optical-white"
                }
              `}
            >
              {task.label}
            </motion.button>
          );
        })}
      </div>

      {selectedId === "other" && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="space-y-3"
        >
          <Textarea
            value={customDescription}
            onChange={(e) => setCustomDescription(e.target.value)}
            placeholder="Describe what you need..."
            className="min-h-[80px] bg-charcoal/50 border-primary-foreground/20 text-optical-white placeholder:text-warm-gray resize-none"
          />
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect("other", customDescription)}
            disabled={!customDescription.trim()}
            className="w-full py-3 rounded-sm bg-brass text-charcoal font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:bg-brass-muted"
          >
            Continue
          </motion.button>
        </motion.div>
      )}
    </div>
  );
}
