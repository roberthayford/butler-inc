import { Button } from "@/components/ui/button";

const services = [
  {
    id: "busy",
    name: "Busy Butler",
    subtitle: "Urgent professional logistics",
    type: "In-Person",
    image: "/images/busy-butler.png",
    examples: [
      "Same-day document delivery",
      "Urgent package collection",
      "Last-minute errands",
      "Confidential courier tasks",
    ],
    priceFrom: "£45",
  },
  {
    id: "baby",
    name: "Baby Butler",
    subtitle: "School runs & child logistics",
    type: "In-Person",
    bodycam: true,
    image: "/images/baby-butler.png",
    examples: [
      "School pick-ups and drop-offs",
      "After-school club shuttling",
      "Collecting forgotten items",
      "Child activity transportation",
    ],
    priceFrom: "£50",
  },
  {
    id: "bougie",
    name: "Bougie Butler",
    subtitle: "Luxury sourcing & experiences",
    type: "In-Person",
    image: "/images/bougie-butler.png",
    examples: [
      "Hard-to-find luxury items",
      "VIP restaurant reservations",
      "Exclusive event access",
      "Personal shopping assistance",
    ],
    priceFrom: "£80",
  },
  {
    id: "base",
    name: "Base Butler",
    subtitle: "Property & home waiting",
    type: "In-Person",
    bodycam: true,
    image: "/images/base-butler.png",
    examples: [
      "Waiting for deliveries",
      "Tradesman coordination",
      "Property checks whilst away",
      "Key holding services",
    ],
    priceFrom: "£35",
  },
  {
    id: "budget",
    name: "Budget Butler",
    subtitle: "Flexible timing, best rates",
    type: "In-Person",
    image: "/images/budget-butler.png",
    examples: [
      "Non-urgent errands",
      "Batch tasks in your area",
      "Scheduled collections",
      "Flexible delivery windows",
    ],
    priceFrom: "£20",
  },
  {
    id: "bespoke",
    name: "Bespoke Butler",
    subtitle: "Custom requests",
    type: "In-Person",
    image: "/images/bespoke-butler.png",
    examples: [
      "Unique personal tasks",
      "Complex multi-step errands",
      "Special occasion support",
      "Whatever you need – just ask",
    ],
    priceFrom: "Quote",
  },
];

const ServiceDetails = () => {
  return (
    <section className="section-padding">
      <div className="max-w-6xl mx-auto">
        <h2 className="font-serif text-3xl md:text-4xl font-medium text-center mb-4">
          Our Butler Services
        </h2>
        <p className="text-muted-foreground text-center mb-16 max-w-xl mx-auto">
          Each butler type is tailored to specific needs. All butlers are vetted, DBS-checked, and committed to excellence.
        </p>

        <div className="space-y-8">
          {services.map((service, index) => (
            <div
              key={service.id}
              id={`service-${service.id}`}
              className={`grid md:grid-cols-2 gap-8 items-center p-8 rounded-2xl ${index % 2 === 0 ? "bg-ivory" : "bg-background"
                }`}
            >
              <div className={index % 2 !== 0 ? "md:order-2" : ""}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-medium uppercase tracking-wider px-2 py-1 rounded bg-secondary text-muted-foreground">
                    {service.type}
                  </span>
                  {service.bodycam && (
                    <span className="text-xs font-medium uppercase tracking-wider px-2 py-1 rounded bg-sage-light text-sage">
                      Body-cam enabled
                    </span>
                  )}
                </div>
                <h3 className="font-serif text-2xl md:text-3xl font-medium mb-2">
                  {service.name}
                </h3>
                <p className="text-gold font-medium mb-4">{service.subtitle}</p>
                <ul className="space-y-2 mb-6">
                  {service.examples.map((example) => (
                    <li key={example} className="text-muted-foreground flex items-start gap-2">
                      <span className="text-gold mt-1">–</span>
                      {example}
                    </li>
                  ))}
                </ul>
                <div className="flex items-center gap-4">
                  <Button className="min-w-[160px]">Book {service.name.split(" ")[0]}</Button>
                  <span className="text-sm text-muted-foreground">
                    From {service.priceFrom}
                    {service.priceFrom !== "Quote" && "/hr"}
                  </span>
                </div>
              </div>

              <div className={`aspect-[4/3] rounded-xl overflow-hidden relative shadow-lg ${index % 2 !== 0 ? "md:order-1" : ""
                }`}>
                <img
                  src={service.image}
                  alt={service.name}
                  className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServiceDetails;