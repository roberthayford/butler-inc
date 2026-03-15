import type { Metadata } from "next";
import { LandingHeroBackground } from "@/components/ui/hero-background";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { ButlerCategoryGrid } from "@/components/landing/ButlerCategoryGrid";

export const metadata: Metadata = {
  title: "Our Butlers | Premium Concierge Services",
  description:
    "Six specialist butlers for every need. Same-day courier, childcare, luxury sourcing, property management, budget errands, and bespoke requests. From £35/hr.",
};

export default function ButlersPage() {
  return (
    <div className="min-h-screen bg-charcoal">
      <LandingHeroBackground>
        <header className="pt-24 pb-16 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl font-serif font-bold text-optical-white tracking-tight">
              Our Butlers
            </h1>
            <p className="mt-4 text-lg text-warm-gray max-w-2xl mx-auto leading-relaxed">
              Six specialist butlers. Each one precisely matched to the task.
            </p>
          </div>
        </header>
      </LandingHeroBackground>

      <HowItWorks />

      <ButlerCategoryGrid showHeader={false} />
    </div>
  );
}
