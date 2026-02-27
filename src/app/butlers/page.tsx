import type { Metadata } from "next";
import Link from "next/link";
import { services } from "@/data/services";

export const metadata: Metadata = {
  title: "Our Butlers | Premium Concierge Services",
  description:
    "Six specialist butlers for every need. Same-day courier, childcare, luxury sourcing, property management, budget errands, and bespoke requests. From £35/hr.",
};

export default function ButlersPage() {
  return (
    <div className="min-h-screen bg-charcoal">
      <header className="pt-24 pb-12 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-serif font-bold text-optical-white tracking-tight">
            Our Butlers
          </h1>
          <p className="mt-4 text-lg text-warm-gray max-w-2xl mx-auto leading-relaxed">
            Six specialist butlers. Each one precisely matched to the task.
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 pb-24">
        <div className="space-y-4">
          {services.map((service) => (
            <Link
              key={service.id}
              href={`/butlers/${service.id}`}
              className="block p-6 rounded-sm bg-primary-foreground/5 border border-primary-foreground/10 hover:border-brass-text/50 transition-all duration-350 hover:bg-primary-foreground/10"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-serif font-semibold text-optical-white">
                    {service.name}
                  </h2>
                  <p className="text-warm-gray text-sm mt-1">
                    {service.subtitle}
                  </p>
                </div>
                <span className="text-sm font-medium px-3 py-1 rounded bg-brass/20 text-brass-text shrink-0 ml-4">
                  {service.priceFrom === "Quote"
                    ? "Quote"
                    : `From ${service.priceFrom}`}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <div className="text-center pb-12">
        <Link
          href="/"
          className="text-warm-gray text-sm hover:text-optical-white transition-colors"
        >
          &larr; Back to home
        </Link>
      </div>
    </div>
  );
}
