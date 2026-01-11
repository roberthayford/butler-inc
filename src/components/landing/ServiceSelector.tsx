const services = [
  {
    id: "busy",
    name: "Busy Butler",
    tagline: "Urgent errands",
    description: "Same-day professional logistics and confidential tasks.",
  },
  {
    id: "baby",
    name: "Baby Butler",
    tagline: "School runs",
    description: "Child logistics with optional body-cam for peace of mind.",
  },
  {
    id: "bougie",
    name: "Bougie Butler",
    tagline: "Luxury sourcing",
    description: "Exclusive access to high-end goods and experiences.",
  },
  {
    id: "base",
    name: "Base Butler",
    tagline: "Home waiting",
    description: "Property checks, key holding, and tradesman coordination.",
  },
  {
    id: "budget",
    name: "Budget Butler",
    tagline: "Flexible timing",
    description: "Best rates when you can wait for route-optimised slots.",
  },
  {
    id: "bespoke",
    name: "Bespoke Butler",
    tagline: "Custom tasks",
    description: "Tell us what you need – we'll find a way.",
  },
];

interface ServiceSelectorProps {
  onServiceSelect?: (serviceId: string) => void;
}

const ServiceSelector = ({ onServiceSelect }: ServiceSelectorProps) => {
  const handleServiceClick = (id: string) => {
    // Update the active tab
    onServiceSelect?.(id);

    // Scroll to the service details section
    const element = document.getElementById("service-details");
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <section className="section-padding bg-ivory">
      <div className="max-w-6xl mx-auto">
        <h2 className="font-serif text-3xl md:text-4xl font-medium text-center mb-4">
          What do you need help with?
        </h2>
        <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">
          Choose a service type, or tell us what you need and we'll match you with the right butler.
        </p>

        <div className="flex overflow-x-auto pb-8 -mx-4 px-4 snap-x snap-mandatory md:grid md:grid-cols-3 md:gap-6 md:pb-0 md:mx-0 md:px-0 scrollbar-hide">
          {services.map((service) => (
            <div key={service.id} className="min-w-[280px] md:min-w-0 snap-center px-2 md:px-0 first:pl-2 last:pr-2">
              <button
                onClick={() => handleServiceClick(service.id)}
                className="w-full group p-6 rounded-xl bg-background shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] hover:shadow-xl transition-all duration-300 text-left active:scale-[0.98] active:bg-accent/5 h-full border border-transparent hover:border-gold/20"
              >
                <div className="flex-1">
                  <h3 className="font-serif text-xl md:text-2xl font-medium text-foreground mb-2 group-hover:text-gold transition-colors">
                    {service.name}
                  </h3>
                  <p className="text-sm text-gold font-medium mb-3 uppercase tracking-wider text-[10px]">{service.tagline}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {service.description}
                  </p>
                </div>
              </button>
            </div>
          ))}
        </div>

        <p className="text-center mt-8 text-muted-foreground">
          Not sure?{" "}
          <a href="#" className="text-foreground underline underline-offset-4 hover:text-gold transition-colors">
            Just tell us what you need
          </a>
        </p>
      </div>
    </section>
  );
};

export default ServiceSelector;