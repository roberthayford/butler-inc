import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { ButlerCategoryGrid } from "@/components/landing/ButlerCategoryGrid";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <main id="main-content">
        <Hero />
        <HowItWorks />
        <ButlerCategoryGrid />
      </main>
      <Footer />
    </>
import { LandingHeroBackground } from "@/components/ui/hero-background";
import Link from "next/link";

export default function Home() {
  return (
    <main id="main-content" className="min-h-screen bg-charcoal">
      <LandingHeroBackground className="min-h-screen relative w-full">
        {/* 
          Single full-height wrapper for all children.
          Uses min-h-screen + flex to truly center content vertically.
          Logo and footer are positioned via pt/pb padding space.
        */}
        <div className="min-h-screen flex flex-col">
          {/* Center Content — flex-1 fills remaining space, inner flex centers */}
          <div className="flex-1 flex items-center justify-center px-6">
            <div className="text-center max-w-4xl mx-auto">
              {/* Logo — centred above headline */}
              <p
                className="text-2xl md:text-3xl font-serif font-bold text-optical-white tracking-wide text-shadow-crisp mb-10 md:mb-14"
                style={{ animation: "fade-up 0.7s ease-out forwards" }}
              >
                Butlers Inc.
              </p>

              <h1
                className="text-5xl sm:text-6xl md:text-7xl lg:text-[5rem] font-serif font-medium text-optical-white tracking-tight leading-tight text-balance text-shadow-crisp opacity-0"
                style={{ animation: "fade-up 0.7s ease-out 100ms forwards" }}
              >
                At Your Service.
                <br className="hidden sm:block" />{" "}
                <span className="italic">Shortly.</span>
              </h1>

              <div
                className="mt-14 opacity-0"
                style={{ animation: "fade-up 0.7s ease-out 300ms forwards" }}
              >
                <Link
                  href="mailto:enquiries@butlersinc.co.uk"
                  className="inline-flex items-center justify-center h-14 px-8 text-sm md:text-base font-medium transition-all duration-300 active:scale-[0.98] border border-brass text-optical-white hover:bg-brass/10 hover:border-brass/70 rounded-sm uppercase tracking-widest bg-charcoal/40 backdrop-blur-sm shadow-sm hover:-translate-y-1 hover:shadow-2xl"
                >
                  Contact Enquiries
                </Link>
              </div>
            </div>
          </div>

          {/* Footer / Copyright — bottom */}
          <footer
            className="shrink-0 p-6 md:p-10 text-center text-xs uppercase tracking-widest text-optical-white/40 opacity-0"
            style={{ animation: "fade-in 1s ease-out 600ms forwards" }}
          >
            <p>
              &copy; 2025 Butlers Inc. All rights reserved.
            </p>
          </footer>
        </div>
      </LandingHeroBackground>

      {/* Keyframe animations */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `,
        }}
      />
    </main>
  );
}
