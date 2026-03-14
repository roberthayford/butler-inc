"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { LandingHeroBackground } from "@/components/ui/hero-background";

export function Hero() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"members" | "non-members">(
    "members"
  );

  const handleTabClick = (tab: "members" | "non-members") => {
    setActiveTab(tab);
    if (tab === "members") {
      router.push("/members/login");
    } else {
      router.push("/butlers");
    }
  };

  return (
    <LandingHeroBackground className="min-h-screen flex items-center justify-center">
      <div className="text-center px-6 max-w-4xl mx-auto">
        {/* Staggered entrance: headline -> subtitle -> CTA */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-serif font-bold text-optical-white tracking-tight leading-tight"
        >
          Your personal butler, on demand.
        </motion.h1>

        {/* Segmented control */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.5,
            delay: 0.3,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="mt-10 inline-flex gap-8"
        >
          <button
            onClick={() => handleTabClick("members")}
            className={`
              px-1 pb-2 text-sm font-medium tracking-wide transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-105 active:scale-95 border-b-2
              ${activeTab === "members"
                ? "border-optical-white text-optical-white"
                : "border-transparent text-optical-white/50 hover:text-optical-white"
              }
            `}
          >
            Members
          </button>
          <button
            onClick={() => handleTabClick("non-members")}
            className={`
              px-1 pb-2 text-sm font-medium tracking-wide transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-105 active:scale-95 border-b-2
              ${activeTab === "non-members"
                ? "border-optical-white text-optical-white"
                : "border-transparent text-optical-white/50 hover:text-optical-white"
              }
            `}
          >
            Non-Members
          </button>
        </motion.div>
      </div>
    </LandingHeroBackground>
  );
}
