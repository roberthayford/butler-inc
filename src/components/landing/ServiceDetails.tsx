import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { services, type ServiceId } from "@/data/services";

interface ServiceDetailsProps {
  activeService?: string;
  onServiceChange?: (serviceId: string) => void;
}

const ServiceDetails = ({ activeService = "busy", onServiceChange }: ServiceDetailsProps) => {
  return (
    <section id="service-details" className="section-padding bg-secondary">
      <div className="max-w-6xl mx-auto">
        <h2 className="font-serif text-3xl md:text-4xl font-medium text-center mb-4">
          Choose Your Butler
        </h2>
        <p className="text-muted-foreground text-center mb-10 max-w-xl mx-auto">
          Every butler. Vetted. Discreet. Available.
        </p>

        <Tabs
          value={activeService}
          onValueChange={onServiceChange}
          className="w-full"
        >
          {/* Tab Navigation - horizontally scrollable on mobile */}
          <div className="mb-8">
            <TabsList className="w-full h-auto p-1.5 bg-secondary/50 rounded-xl flex overflow-x-auto scrollbar-hide snap-x snap-mandatory gap-1 md:justify-center">
              {services.map((service) => (
                <TabsTrigger
                  key={service.id}
                  value={service.id}
                  className="flex-shrink-0 snap-center px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-300 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md data-[state=active]:border-brass/20 hover:bg-background/50"
                >
                  {service.shortName}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Tab Content */}
          {services.map((service) => (
            <TabsContent
              key={service.id}
              value={service.id}
              className="mt-0 animate-fade-in"
            >
              <div className="grid md:grid-cols-2 gap-8 items-center p-6 md:p-8 rounded-2xl bg-ivory">
                {/* Content Side */}
                <div className="order-2 md:order-1">
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
                  <p className="text-brass font-medium mb-4">{service.subtitle}</p>
                  <ul className="space-y-2 mb-6">
                    {service.examples.map((example) => (
                      <li key={example} className="text-muted-foreground flex items-start gap-2">
                        <span className="text-brass mt-1">–</span>
                        {example}
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-center gap-4">
                    <Button className="min-w-[160px]">Reserve this Butler</Button>
                    <span className="text-sm text-muted-foreground">
                      From {service.priceFrom}
                      {service.priceFrom !== "Quote" && " per hour"}
                    </span>
                  </div>
                </div>

                {/* Image Side */}
                <div className="order-1 md:order-2 aspect-[4/3] rounded-xl overflow-hidden relative shadow-lg">
                  <img
                    src={service.image}
                    alt={service.name}
                    className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                  />
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
};

export default ServiceDetails;