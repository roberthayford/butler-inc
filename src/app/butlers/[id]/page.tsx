import { Suspense } from "react";
import { notFound } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { Metadata } from "next";
import { services, type ServiceId } from "@/data/services";
import { butlerPageConfigs } from "@/data/butler-page-configs";
import type { ButlerTypeKey } from "@/data/butler-tasks";
import { HeroBackground } from "@/components/ui/hero-background";
import { ButlerPageSections } from "@/components/butler-page-sections";

/**
 * bundle-dynamic-imports: BookingFlow is the heaviest client component.
 * Dynamic import keeps the SSG shell lightweight.
 */
const BookingFlow = dynamic(
  () =>
    import("@/components/booking/BookingFlow").then((mod) => ({
      default: mod.BookingFlow,
    })),
  {
    loading: () => (
      <div className="max-w-2xl mx-auto animate-pulse">
        <div className="h-8 bg-primary-foreground/10 rounded w-48 mb-4" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-primary-foreground/10 rounded" />
          ))}
        </div>
      </div>
    ),
  }
);

const VALID_IDS: ServiceId[] = [
  "busy",
  "baby",
  "bougie",
  "base",
  "budget",
  "bespoke",
];

export function generateStaticParams() {
  return VALID_IDS.map((id) => ({ id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  if (!VALID_IDS.includes(id as ServiceId)) return {};

  const config = butlerPageConfigs[id as ServiceId];

  return {
    title: config.seo.title,
    description: config.seo.description,
    keywords: config.seo.keywords,
  };
}

export default async function ButlerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!VALID_IDS.includes(id as ServiceId)) {
    notFound();
  }

  const butlerType = id as ButlerTypeKey;
  const serviceId = id as ServiceId;
  const config = butlerPageConfigs[serviceId];
  const service = services.find((s) => s.id === id)!;

  const priceValue = service.priceFrom.replace(/[^0-9]/g, "");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: config.seo.title.split("|")[1]?.trim() || config.seo.title,
    provider: {
      "@type": "Organization",
      name: "Butlers Inc.",
      url: "https://butlersinc.com",
    },
    areaServed: { "@type": "Country", name: "England" },
    description: config.seo.description,
    offers: {
      "@type": "Offer",
      priceCurrency: "GBP",
      price: priceValue || "Contact for quote",
      priceValidUntil: "2027-12-31",
    },
  };

  return (
    <div className="min-h-screen bg-charcoal">
      {/* JSON-LD structured data — content is from static data files only, no user input */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Atmospheric hero with per-butler gradient */}
      <HeroBackground butlerType={serviceId}>
        <header className="pt-24 pb-16 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl font-serif font-bold text-optical-white tracking-tight">
              {config.hero.headline}
            </h1>
            <p className="mt-4 text-lg text-warm-gray max-w-2xl mx-auto leading-relaxed">
              {config.hero.subheading}
            </p>

            {/* Price badge */}
            {service.priceFrom !== "Quote" ? (
              <p className="mt-6 text-sm text-brass-text font-medium">
                From {service.priceFrom}/hr
              </p>
            ) : (
              <p className="mt-6 text-sm text-brass-text font-medium">
                Custom quote
              </p>
            )}
          </div>
        </header>
      </HeroBackground>

      {/* Content sections: How It Works, Trust Indicators, Common Requests */}
      <div className="px-6 py-20 border-b border-primary-foreground/5">
        <ButlerPageSections config={config} />
      </div>

      {/* Booking flow */}
      <main id="book" className="px-6 py-20">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-serif font-semibold text-optical-white text-center tracking-tight mb-10">
            Book your {service.shortName} Butler
          </h2>
          <Suspense
            fallback={
              <div className="text-center py-12">
                <p className="text-warm-gray">Loading booking options...</p>
              </div>
            }
          >
            <BookingFlow butlerType={butlerType} />
          </Suspense>
        </div>
      </main>

      {/* Footer navigation */}
      <div className="text-center pb-12 space-y-3">
        <Link
          href="/butlers"
          className="text-warm-gray text-sm hover:text-optical-white transition-colors block"
        >
          Explore other butlers
        </Link>
      </div>
    </div>
  );
}
