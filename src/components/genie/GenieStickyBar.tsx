"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { GenieDrawer } from "./GenieDrawer";

const SCROLL_THRESHOLD = 200;
const PREMIUM_EASE = [0.22, 1, 0.36, 1] as const;

export function GenieStickyBar() {
  const [visible, setVisible] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > SCROLL_THRESHOLD);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <motion.aside
        role="complementary"
        aria-hidden={!visible || drawerOpen ? "true" : "false"}
        aria-label="Genie wish CTA"
        initial={{ opacity: 0, y: 20 }}
        animate={
          visible && !drawerOpen
            ? { opacity: 1, y: 0 }
            : { opacity: 0, y: 20 }
        }
        transition={{ duration: 0.3, ease: PREMIUM_EASE }}
        className={`
          fixed bottom-0 left-0 right-0 z-50
          md:bottom-6 md:right-6 md:left-auto md:w-[380px]
          ${!visible || drawerOpen ? "pointer-events-none" : ""}
        `}
      >
        {/* Ambient glow — desktop only */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-sm hidden md:block">
          <div className="absolute bottom-0 right-0 w-[200px] h-[200px] rounded-full bg-destructive/[0.04] blur-[80px]" />
        </div>

        {/* Shared container: mobile = slim bar, desktop = floating card */}
        <div
          className={`
            bg-charcoal/95 backdrop-blur-md
            border-t border-primary-foreground/10
            px-4 py-3 flex items-center justify-between gap-3
            md:border md:rounded-sm md:p-5 md:block md:shadow-lg md:shadow-black/20
          `}
        >
          <p
            className={`
              text-warm-gray text-sm truncate
              md:text-optical-white md:font-serif md:text-lg md:truncate-none
            `}
          >
            Have an impossible wish?
          </p>

          {/* Desktop-only subtitle */}
          <p className="hidden md:block text-warm-gray text-sm mt-1.5 relative">
            Tell us what you want. We{"'"}ll make it happen.
          </p>

          <button
            onClick={() => setDrawerOpen(true)}
            className={`
              shrink-0 px-4 py-2 rounded-sm bg-destructive text-white text-sm font-medium
              hover:bg-destructive/90 transition-colors
              md:relative md:mt-4 md:w-full md:py-2.5
              md:hover:shadow-[0_0_24px_rgba(223,49,49,0.25)] md:transition-all md:duration-300
            `}
          >
            Summon Your Genie
          </button>
        </div>
      </motion.aside>

      <GenieDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
