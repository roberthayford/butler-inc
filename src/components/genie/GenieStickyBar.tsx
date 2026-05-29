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
        <button
          onClick={() => setDrawerOpen(true)}
          className={`
            bg-charcoal/95 backdrop-blur-md
            border-t border-primary-foreground/10
            w-full px-4 py-3 rounded-sm
            text-white text-sm font-medium
            hover:bg-charcoal transition-colors
            md:border md:bg-destructive md:px-5 md:py-3
            md:hover:bg-destructive/90 md:shadow-lg md:shadow-black/20
            md:hover:shadow-[0_0_24px_rgba(223,49,49,0.25)]
            md:transition-all md:duration-300
          `}
        >
          Summon Your Genie
        </button>
      </motion.aside>

      <GenieDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
