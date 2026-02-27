import { Suspense } from "react";
import { notFound } from "next/navigation";
import dynamic from "next/dynamic";
import type { Metadata } from "next";
import { services, type ServiceId } from "@/data/services";
import { butlerPageConfigs } from "@/data/butler-page-configs";
import type { ButlerTypeKey } from "@/data/butler-tasks";

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
  const service = services.find((s) => s.id === id)!;
  const priceValue = service.priceFrom.replace(/[^0-9]/g, "");

  return {
    title: config.seo.title,
    description: config.seo.description,
    keywords: config.seo.keywords,
    other: {
      "script:ld+json": JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Service",
        name: config.seo.title.split("|")[1]?.trim() || config.seo.title,
        provider: {
          "@type": "Organization",
          name: "Butlers Inc.",
          url: "https://butlersinc.co.uk",
        },
        areaServed: { "@type": "Country", name: "England" },
        description: config.seo.description,
        offers: {
          "@type": "Offer",
          priceCurrency: "GBP",
          price: priceValue || "Contact for quote",
          priceValidUntil: "2027-12-31",
        },
      }),
    },
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
  const config = butlerPageConfigs[id as ServiceId];

  return (
    <div className="min-h-screen bg-charcoal">
      {/* Compact hero */}
      <header className="pt-24 pb-12 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-serif font-bold text-optical-white">
            {config.hero.headline}
          </h1>
          <p className="mt-4 text-lg text-warm-gray max-w-2xl mx-auto">
            {config.hero.subheading}
          </p>
        </div>
      </header>

      {/* Booking flow wrapped in Suspense */}
      <main className="px-6 pb-24">
        <Suspense
          fallback={
            <div className="max-w-2xl mx-auto text-center py-12">
              <p className="text-warm-gray">Loading booking options...</p>
            </div>
          }
        >
          <BookingFlow butlerType={butlerType} />
        </Suspense>
      </main>

      <div className="text-center pb-12">
        <a
          href="/"
          className="text-warm-gray text-sm hover:text-optical-white transition-colors"
        >
          &larr; Back to home
        </a>
      </div>
    </div>
  );
}
