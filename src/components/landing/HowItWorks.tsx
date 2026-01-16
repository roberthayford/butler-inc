import { Button } from "@/components/ui/button";

const steps = [
  {
    number: "Step 1",
    title: "Required Service",
    description: "Choose a butler type and describe your task in under a minute.",
  },
  {
    number: "Step 2",
    title: "Pick a time & price",
    description: "See live time slots with dynamic pricing based on routes and demand.",
  },
  {
    number: "Step 3",
    title: "We handle the rest",
    description: "A vetted butler completes your task – track via updates or body-cam where enabled.",
  },
];

const HowItWorks = () => {
  return (
    <section className="section-padding">
      <div className="max-w-5xl mx-auto">
        <h2 className="font-serif text-3xl md:text-4xl font-medium text-center mb-16">
          How Ohmybutler works
        </h2>

        <div className="grid md:grid-cols-3 gap-12 md:gap-8 mb-12">
          {steps.map((step, index) => (
            <div key={step.number} className="text-center md:text-left relative">
              {/* Connector line for desktop */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-px bg-border" />
              )}

              <span className="inline-block font-serif text-4xl text-gold-muted mb-4">
                {step.number}
              </span>
              <h3 className="font-serif text-xl font-medium mb-3">{step.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Button size="lg" className="min-w-[200px]">
            Start a booking
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;