import { useState } from "react";
import Quiz from "./Quiz";

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
  const [quizOpen, setQuizOpen] = useState(false);

  const handleServiceClick = (id: string) => {
    // Update the active tab
    onServiceSelect?.(id);

    // Scroll to the service details section
    const element = document.getElementById("service-details");
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleQuizSelect = (serviceId: string) => {
    handleServiceClick(serviceId);
  };

  return (
    <>
      <section id="services" className="section-padding bg-ivory">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-serif text-3xl md:text-4xl font-medium text-center mb-4">
            What do you need help with?
          </h2>
          <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">
            Choose a service type, or take our quick quiz to find the right butler for you.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {services.map((service) => (
              <button
                key={service.id}
                onClick={() => handleServiceClick(service.id)}
                className="w-full group p-4 md:p-6 rounded-xl bg-background shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] hover:shadow-xl transition-all duration-300 text-left active:scale-[0.98] active:bg-accent/5 border border-transparent hover:border-brass/20"
              >
                <h3 className="font-serif text-lg md:text-xl font-medium text-foreground mb-1 group-hover:text-brass transition-colors">
                  {service.name}
                </h3>
                <p className="text-xs md:text-sm text-brass font-medium uppercase tracking-wider">
                  {service.tagline}
                </p>
              </button>
            ))}
          </div>

          <p className="text-center mt-8 text-muted-foreground">
            Not sure?{" "}
            <button
              onClick={() => setQuizOpen(true)}
              className="text-foreground underline underline-offset-4 hover:text-brass transition-colors"
            >
              Take our short quiz
            </button>
          </p>
        </div>
      </section>

      <Quiz
        open={quizOpen}
        onOpenChange={setQuizOpen}
        onSelectService={handleQuizSelect}
      />
    </>
  );
};

export default ServiceSelector;