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

const ServiceSelector = () => {
  const scrollToService = (id: string) => {
    const element = document.getElementById(`service-${id}`);
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

        <div className="relative">
          {/* Mobile Edge Fades */}
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-ivory to-transparent pointer-events-none z-10 md:hidden" />
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-ivory to-transparent pointer-events-none z-10 md:hidden" />

          <div className="flex md:grid md:grid-cols-3 gap-4 md:gap-6 overflow-x-auto snap-x snap-mandatory pb-8 md:pb-0 -mx-4 px-14 md:mx-0 md:px-0 scrollbar-hide">
            {services.map((service) => (
              <button
                key={service.id}
                onClick={() => scrollToService(service.id)}
                className="group p-6 rounded-lg bg-background border border-border hover:border-gold/50 hover:shadow-lg transition-all duration-300 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] text-left active:scale-[0.98] active:bg-accent/5 active:border-gold min-w-[85vw] sm:min-w-[300px] md:min-w-0 md:w-auto snap-start shrink-0 flex flex-col h-full"
              >
                <div className="flex-1">
                  <h3 className="font-serif text-lg md:text-xl font-medium text-foreground mb-1 group-hover:text-gold transition-colors">
                    {service.name}
                  </h3>
                  <p className="text-sm text-gold font-medium mb-2">{service.tagline}</p>
                  <p className="text-sm text-muted-foreground block">
                    {service.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
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