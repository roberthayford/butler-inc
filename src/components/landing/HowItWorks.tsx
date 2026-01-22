import { Button } from "@/components/ui/button";

const steps = [
  {
    number: "Step 1",
    title: "Select",
    description: "Choose a butler. Describe the task. Done in under sixty seconds.",
  },
  {
    number: "Step 2",
    title: "Confirm",
    description: "Select an available slot. Price shown upfront.",
  },
  {
    number: "Step 3",
    title: "Relax",
    description: "Your butler takes over. Track progress in real time.",
  },
];

const HowItWorks = () => {
  return (
    <section className="section-padding bg-ivory">
      <div className="max-w-5xl mx-auto">
        <h2 className="font-serif text-3xl md:text-4xl font-medium text-center mb-16">
          How Butlers Inc. works
        </h2>

        <div className="grid md:grid-cols-3 gap-12 md:gap-8 mb-12">
          {steps.map((step, index) => (
            <div key={step.number} className="text-center md:text-left relative">
              {/* Connector line for desktop */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-px bg-border" />
              )}

              <span className="inline-block font-serif text-4xl text-brass-muted mb-4">
                {step.number}
              </span>
              <h3 className="font-serif text-xl font-medium mb-3">{step.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Button size="lg" className="min-w-[200px]">
            Begin Now
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;