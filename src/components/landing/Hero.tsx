"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { LandingHeroBackground } from "@/components/ui/hero-background";

export function Hero() {
  return (
    <LandingHeroBackground className="min-h-screen flex items-center justify-center">
      <div className="text-center px-6 max-w-4xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-serif font-bold text-optical-white tracking-tight leading-tight"
        >
          Your personal butler, on demand.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="mt-4 text-warm-gray text-lg"
        >
          Premium concierge across England. From £35/hr.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            href="/butlers"
            className="px-8 py-3 rounded-sm bg-brass text-charcoal font-medium hover:bg-brass-muted transition-colors text-sm tracking-wide"
          >
            Browse Our Butlers
          </Link>
          <Link
            href="/members/login"
            className="px-8 py-3 rounded-sm border border-optical-white/40 text-optical-white font-medium hover:border-optical-white hover:bg-optical-white/10 transition-colors text-sm tracking-wide"
          >
            Sign In
          </Link>
        </motion.div>
      </div>
    </LandingHeroBackground>
  );
}
