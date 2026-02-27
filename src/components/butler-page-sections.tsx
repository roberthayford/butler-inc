/**
 * Butler page content sections — renders howItWorks, trustIndicators,
 * and commonRequests from butlerPageConfigs.
 *
 * Server Component. Zero client JS. All data is static from config files.
 * rendering-hoist-jsx: Static elements extracted outside the component.
 */

import type { ButlerPageConfig } from "@/data/butler-page-configs";

interface ButlerPageSectionsProps {
  config: ButlerPageConfig;
}

export function ButlerPageSections({ config }: ButlerPageSectionsProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-20">
      {/* How It Works */}
      <section>
        <h2 className="text-2xl sm:text-3xl font-serif font-semibold text-optical-white text-center tracking-tight mb-12">
          {config.howItWorks.title}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {config.howItWorks.steps.map((step, i) => (
              <div key={i} className="text-center">
                <span className="block text-4xl font-serif font-semibold text-brass-text/40 mb-4">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="text-lg font-serif font-semibold text-optical-white mb-2">
                  {step.title}
                </h3>
                <p className="text-warm-gray text-sm leading-relaxed max-w-xs mx-auto">
                  {step.description}
                </p>
              </div>
            ))}
        </div>
      </section>

      {/* Trust Indicators */}
      <section>
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-2 text-warm-gray text-sm tracking-wide">
          {config.trustIndicators.map((indicator, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && (
                <span className="text-warm-gray/30" aria-hidden="true">
                  &mdash;
                </span>
              )}
              <span>{indicator.text}</span>
            </span>
          ))}
        </div>
      </section>

      {/* Common Requests */}
      <section>
        <h2 className="text-2xl sm:text-3xl font-serif font-semibold text-optical-white text-center tracking-tight mb-10">
          Common requests
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
          {config.commonRequests.map((request, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-4 rounded-sm bg-primary-foreground/5 border border-primary-foreground/10"
            >
              <span className="text-brass-text text-sm font-serif font-semibold mt-0.5 shrink-0">
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className="text-warm-gray text-sm leading-relaxed">
                {request}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
