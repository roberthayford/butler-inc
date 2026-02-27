import Link from "next/link";
import { services } from "@/data/services";

export function ButlerCategoryGrid() {
  return (
    <section id="butler-categories" className="bg-charcoal section-padding">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-serif font-bold text-optical-white text-center mb-4">
          Choose Your Butler
        </h2>
        <p className="text-warm-gray text-center mb-12 max-w-2xl mx-auto">
          Six specialist butlers, one mission: get it done.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service) => (
            <Link
              key={service.id}
              href={`/butlers/${service.id}`}
              className="group relative p-6 rounded-xl bg-primary-foreground/5 border border-primary-foreground/10 backdrop-blur-sm hover:border-brass/50 transition-all duration-350 hover:bg-primary-foreground/10"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-xl font-serif font-semibold text-optical-white group-hover:text-brass transition-colors">
                  {service.name}
                </h3>
                <span className="text-xs font-medium px-2 py-1 rounded bg-brass/20 text-brass shrink-0 ml-2">
                  {service.priceFrom === "Quote"
                    ? "Quote"
                    : `From ${service.priceFrom}`}
                </span>
              </div>
              <p className="text-warm-gray text-sm">{service.subtitle}</p>
              <ul className="mt-3 space-y-1">
                {service.examples.slice(0, 2).map((ex, i) => (
                  <li
                    key={i}
                    className="text-xs text-warm-gray/70 truncate"
                  >
                    &bull; {ex}
                  </li>
                ))}
              </ul>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
