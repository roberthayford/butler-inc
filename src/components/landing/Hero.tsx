import { Button } from "@/components/ui/button";

const Hero = () => {
  return (
    <section className="min-h-screen flex flex-col justify-center relative overflow-hidden pt-20">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full bg-gold blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 rounded-full bg-sage blur-3xl" />
      </div>

      <div className="max-w-5xl mx-auto pl-[calc(1.25rem+env(safe-area-inset-left))] pr-[calc(1.25rem+env(safe-area-inset-right))] md:px-8 text-center relative z-10">
        <h1 className="font-serif text-5xl sm:text-5xl md:text-6xl lg:text-7xl font-medium tracking-tight text-foreground mb-6 animate-fade-up leading-[1.1] text-balance">
          Your personal butler,
          <br />
          <span className="italic">on demand</span>
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-up" style={{ animationDelay: "0.1s" }}>
          Trusted assistants for urgent tasks, childcare logistics, luxury sourcing and home waiting – across England.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up" style={{ animationDelay: "0.2s" }}>
          <Button size="lg" className="min-w-[200px] text-base font-medium">
            Book a Butler
          </Button>
          <a
            href="#membership"
            className="text-sm font-medium text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
          >
            Explore membership
          </a>
        </div>

        <p className="text-sm text-muted-foreground mt-6 animate-fade-up" style={{ animationDelay: "0.3s" }}>
          No membership required for Pay As You Go.
        </p>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2">
          <div className="w-1 h-2 bg-muted-foreground/50 rounded-full" />
        </div>
      </div>
    </section>
  );
};

export default Hero;