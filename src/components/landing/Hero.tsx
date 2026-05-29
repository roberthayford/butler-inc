"use client";

import { motion } from "motion/react";
import { LandingHeroBackground } from "@/components/ui/hero-background";
import { AudienceCTA } from "@/components/landing/AudienceCTA";

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
          Your personal butler, <span className="block italic tracking-wider">on demand</span>
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="mt-10 w-full"
        >
          <AudienceCTA className="w-full" />
        </motion.div>
      </div>
    </LandingHeroBackground>
  );
}
