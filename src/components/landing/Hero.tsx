import { Button } from "@/components/ui/button";

const Hero = () => {
  return (
    <section className="min-h-screen flex flex-col justify-center relative overflow-hidden pt-20">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src="/images/hero-butler.png"
          alt="Luxury Butler Service"
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/95 via-background/70 to-background" />
      </div>

      <div className="max-w-5xl mx-auto pl-[calc(1.25rem+env(safe-area-inset-left))] pr-[calc(1.25rem+env(safe-area-inset-right))] md:px-8 text-center relative z-10">
        <h1 className="font-serif text-5xl sm:text-5xl md:text-6xl lg:text-7xl font-medium tracking-normal text-foreground mb-6 animate-fade-up leading-[1.1] md:leading-[1.15] text-balance">
          Life, <span className="italic">handled.</span>
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-up" style={{ animationDelay: "0.1s" }}>
          Discreet assistance for everything you'd rather not handle yourself.<br className="hidden sm:block" />
          Across England.
        </p>

        <div className="flex flex-col items-center gap-6 animate-fade-up" style={{ animationDelay: "0.2s" }}>
          {/* Members / Non-Members Segmented Control */}
          <div className="inline-flex rounded-xl bg-secondary/50 p-1.5 gap-1">
            <Button
              size="lg"
              className="min-w-[140px] min-h-[48px] text-base font-medium"
            >
              Members
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="min-w-[140px] min-h-[48px] text-base font-medium hover:bg-background/50"
            >
              Non-Members
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;