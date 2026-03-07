import { LandingHeroBackground } from "@/components/ui/hero-background";
import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main-content" className="min-h-screen bg-charcoal">
      <LandingHeroBackground className="min-h-screen relative w-full">
        <div className="min-h-screen flex flex-col">
          <div className="flex-1 flex items-center justify-center px-6">
            <div className="text-center max-w-2xl mx-auto">
              <p
                className="text-2xl md:text-3xl font-serif font-bold text-optical-white tracking-wide text-shadow-crisp mb-10 md:mb-14"
                style={{ animation: "fade-up 0.7s ease-out forwards" }}
              >
                Butlers Inc.
              </p>

              <h1
                className="text-5xl sm:text-6xl md:text-7xl font-serif font-medium text-optical-white tracking-tight leading-tight text-balance text-shadow-crisp opacity-0"
                style={{ animation: "fade-up 0.7s ease-out 100ms forwards" }}
              >
                Page Not Found
              </h1>

              <p
                className="mt-8 text-lg sm:text-xl text-optical-white/80 leading-relaxed font-sans max-w-md mx-auto opacity-0"
                style={{ animation: "fade-up 0.7s ease-out 150ms forwards" }}
              >
                We&apos;re still preparing things. Head back to the main page.
              </p>

              <div
                className="mt-14 opacity-0"
                style={{ animation: "fade-up 0.7s ease-out 300ms forwards" }}
              >
                <Link
                  href="/"
                  className="inline-flex items-center justify-center h-14 px-8 text-sm md:text-base font-medium transition-all duration-300 active:scale-[0.98] border border-brass text-optical-white hover:bg-brass/10 hover:border-brass/70 rounded-sm uppercase tracking-widest bg-charcoal/40 backdrop-blur-sm shadow-sm hover:-translate-y-1 hover:shadow-2xl"
                >
                  Back to Home
                </Link>
              </div>
            </div>
          </div>

          <footer
            className="shrink-0 p-6 md:p-10 text-center text-xs uppercase tracking-widest text-optical-white/40 opacity-0"
            style={{ animation: "fade-in 1s ease-out 600ms forwards" }}
          >
            <p>
              &copy; {new Date().getFullYear()} Butlers Inc. All rights
              reserved.
            </p>
          </footer>
        </div>
      </LandingHeroBackground>

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
