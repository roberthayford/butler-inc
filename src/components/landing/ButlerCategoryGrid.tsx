"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { services, type ServiceId } from "@/data/services";
import { butlerPageConfigs } from "@/data/butler-page-configs";
import { BUTLER_PRICING } from "@/data/pricing-config";

/**
 * Per-butler accent colours for the top border gradient.
 * Creates visual differentiation without stock photography.
 */
const CARD_ACCENTS: Record<ServiceId, string> = {
  busy: "from-orange-400/40 via-amber-500/20 to-transparent",
  baby: "from-blue-400/40 via-sky-300/20 to-transparent",
  bougie: "from-rose-400/40 via-pink-500/20 to-transparent",
  base: "from-amber-500/40 via-yellow-600/20 to-transparent",
  budget: "from-emerald-400/40 via-green-500/20 to-transparent",
  bespoke: "from-violet-400/40 via-purple-500/20 to-transparent",
};

/**
 * rendering-hoist-jsx: Stagger delay per card for entrance animation.
 * rerender-memo: Static config lookup memoised as const outside render.
 */
const STAGGER_DELAY = 0.06;

interface ButlerCategoryGridProps {
  showHeader?: boolean;
}

export function ButlerCategoryGrid({ showHeader = true }: ButlerCategoryGridProps) {
  return (
    <section id="butler-categories" className="bg-charcoal section-padding relative">
      <div className="bg-noise" />
      <div className="max-w-6xl mx-auto">
        {showHeader && (
          <>
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="text-3xl sm:text-4xl font-serif font-bold text-optical-white text-center mb-4 tracking-tight"
            >
              Choose Your Butler
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: 0.1,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="text-warm-gray text-center mb-12 max-w-2xl mx-auto leading-relaxed"
            >
              Six specialist butlers. Each one precisely matched to the task.
            </motion.p>
          </>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service, i) => {
            const config = butlerPageConfigs[service.id];
            const accent = CARD_ACCENTS[service.id];
            const pricing = BUTLER_PRICING[service.id];

            return (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.45,
                  delay: i * STAGGER_DELAY,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <Link
                  href={`/butlers/${service.id}`}
                  className="group relative overflow-hidden block p-6 rounded-sm bg-primary-foreground/5 border border-primary-foreground/10 backdrop-blur-sm hover:border-primary-foreground/25 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.01] active:scale-[0.99] hover:bg-primary-foreground/10 h-full"
                >
                  <div
                    className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${accent} opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out z-20`}
                  />

                  {/* Atmospheric Image Layer */}
                  {service.image && (
                    <div className="absolute inset-0 z-0 overflow-hidden rounded-sm opacity-10 group-hover:opacity-40 transition-opacity duration-700 ease-out mix-blend-luminosity">
                      <Image
                        src={service.image}
                        alt={`${service.name} background`}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover scale-105 group-hover:scale-100 transition-transform duration-1000 ease-out"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/80 to-transparent" />
                    </div>
                  )}

                  <div className="relative z-10 mb-3">
                    <h3 className="text-xl font-serif font-semibold text-optical-white group-hover:text-brass-text transition-colors">
                      {service.name}
                    </h3>
                    <p className="text-brass-text text-sm mt-1 font-medium">
                      {pricing.bookingType === "consultation"
                        ? "Consultation"
                        : `From £${pricing.hourlyRate}/hour`}
                    </p>
                    {service.priceFrom && (
                      <span className="text-xs font-medium px-2 py-1 rounded bg-brass/20 text-brass-text shrink-0 ml-2">
                        {service.priceFrom}
                      </span>
                    )}
                  </div>
                  <p className="relative z-10 text-warm-gray text-sm leading-relaxed">
                    {service.subtitle}
                  </p>

                  <ul className="relative z-10 mt-3 space-y-1.5">
                    {config.hero.useCases.slice(0, 2).map((useCase, j) => (
                      <li
                        key={j}
                        className="text-xs text-warm-gray/80 leading-relaxed flex items-start gap-2"
                      >
                        <span className="text-brass-text/60 mt-px shrink-0">
                          &bull;
                        </span>
                        <span className="line-clamp-1">{useCase}</span>
                      </li>
                    ))}
                  </ul>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
