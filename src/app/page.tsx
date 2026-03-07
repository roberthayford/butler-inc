import { LandingHeroBackground } from "@/components/ui/hero-background";

const SERVICES = [
  { name: "Busy Butler", desc: "Same-day courier and urgent errands" },
  { name: "Baby Butler", desc: "School runs, childcare, and welfare checks" },
  { name: "Bougie Butler", desc: "Luxury sourcing and VIP experiences" },
  { name: "Base Butler", desc: "Property waiting and home management" },
  { name: "Budget Butler", desc: "Flexible-timing errands at the best rates" },
  { name: "Bespoke Butler", desc: "Custom requests — if you can describe it, consider it arranged" },
] as const;

export default function Home() {
  return (
    <main id="main-content" className="min-h-screen bg-charcoal">
      <LandingHeroBackground className="min-h-screen relative w-full">
        <div className="min-h-screen flex flex-col">
          {/* Hero */}
          <div className="flex-1 flex items-center justify-center px-6">
            <div className="text-center max-w-4xl mx-auto">
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

              <p
                className="mt-8 text-lg sm:text-xl md:text-2xl text-optical-white/80 leading-relaxed font-sans max-w-xl mx-auto opacity-0"
                style={{ animation: "fade-up 0.7s ease-out 150ms forwards" }}
              >
                The new standard in premium concierge across England is being
                prepared.
              </p>

              <div
                className="mt-14 opacity-0"
                style={{ animation: "fade-up 0.7s ease-out 300ms forwards" }}
              >
                <a
                  href="mailto:hello@butlersinc.com"
                  className="inline-flex items-center justify-center h-14 px-8 text-sm md:text-base font-medium transition-all duration-300 active:scale-[0.98] border border-brass text-optical-white hover:bg-brass/10 hover:border-brass/70 rounded-sm uppercase tracking-widest bg-charcoal/40 backdrop-blur-sm shadow-sm hover:-translate-y-1 hover:shadow-2xl"
                >
                  Get in Touch
                </a>
              </div>
            </div>
          </div>

          {/* Services Overview */}
          <section
            className="px-6 pb-16 opacity-0"
            style={{ animation: "fade-up 0.7s ease-out 450ms forwards" }}
          >
            <div className="max-w-2xl mx-auto">
              <h2 className="text-center text-xs uppercase tracking-[0.25em] text-optical-white/50 mb-8 font-sans">
                What We Offer
              </h2>
              <ul className="space-y-3">
                {SERVICES.map((s) => (
                  <li
                    key={s.name}
                    className="text-center text-sm sm:text-base text-optical-white/70 font-sans leading-relaxed"
                  >
                    <span className="text-optical-white font-medium">{s.name}</span>
                    <span className="text-optical-white/30 mx-2">&mdash;</span>
                    {s.desc}
                  </li>
                ))}
              </ul>
              <p className="text-center text-xs text-optical-white/30 mt-8 uppercase tracking-widest">
                From &pound;35/hr
              </p>
            </div>
          </section>

          {/* Footer */}
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
