import { useState } from "react";
import { Button } from "@/components/ui/button";

const Hero = () => {
  const [activeSegment, setActiveSegment] = useState<"members" | "non-members">("non-members");

  const handleMembersClick = () => {
    setActiveSegment("members");
    // Scroll to membership section
    document.getElementById("membership")?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  };

  const handleNonMembersClick = () => {
    setActiveSegment("non-members");
    // Scroll to butler selection grid
    document.getElementById("butler-selection")?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  };

  return (
    <section className="min-h-screen flex flex-col justify-center relative overflow-hidden pt-20">
      {/* Background Image - Full opacity, overlay controls darkness */}
      <div className="absolute inset-0 z-0">
        <img
          src="/images/hero-butler.png"
          alt="Luxury Butler Service"
          className="w-full h-full object-cover"
        />
        {/* Dark Overlay - 60-70% opacity for image visibility */}
        <div className="absolute inset-0 hero-overlay" />
      </div>

      <div className="max-w-5xl mx-auto pl-[calc(1.25rem+env(safe-area-inset-left))] pr-[calc(1.25rem+env(safe-area-inset-right))] md:px-8 text-center relative z-10">
        <h1 className="font-serif text-5xl sm:text-5xl md:text-6xl lg:text-7xl font-medium tracking-wide text-optical-white mb-6 animate-fade-up leading-[1.1] md:leading-[1.15] text-balance text-shadow-crisp">
          Life, <span className="italic">handled.</span>
        </h1>

        <p className="text-lg md:text-xl text-optical-white/80 max-w-2xl mx-auto mb-10 animate-fade-up text-shadow-crisp" style={{ animationDelay: "0.1s" }}>
          Discreet assistance for everything you'd rather not handle yourself.<br className="hidden sm:block" />
          Across England.
        </p>

        <div className="flex flex-col items-center gap-6 animate-fade-up" style={{ animationDelay: "0.2s" }}>
          {/* Members / Non-Members Segmented Control */}
          <div className="inline-flex rounded-xl hero-segmented-control p-1.5 gap-1">
            <Button
              size="lg"
              variant={activeSegment === "members" ? "default" : "ghost"}
              onClick={handleMembersClick}
              className={`min-w-[140px] min-h-[48px] text-base font-medium ${activeSegment === "members"
                  ? "bg-optical-white text-charcoal hover:bg-optical-white/90"
                  : "text-optical-white/80 hover:text-optical-white hover:bg-optical-white/10"
                }`}
            >
              Members
            </Button>
            <Button
              size="lg"
              variant={activeSegment === "non-members" ? "default" : "ghost"}
              onClick={handleNonMembersClick}
              className={`min-w-[140px] min-h-[48px] text-base font-medium ${activeSegment === "non-members"
                  ? "bg-optical-white text-charcoal hover:bg-optical-white/90"
                  : "text-optical-white/80 hover:text-optical-white hover:bg-optical-white/10"
                }`}
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