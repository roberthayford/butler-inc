import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

const StickyBookingBar = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show after scrolling past ~70% of viewport height
      setIsVisible(window.scrollY > window.innerHeight * 0.7);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-t border-border shadow-[0_-8px_20px_-12px_rgba(0,0,0,0.1)] md:hidden transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isVisible ? "translate-y-0" : "translate-y-[120%]"
        }`}
    >
      {/* Drag handle hint */}
      <div className="w-full flex justify-center pt-2">
        <div className="w-10 h-1 bg-muted-foreground/20 rounded-full" />
      </div>

      <div className="pl-[calc(1.25rem+env(safe-area-inset-left))] pr-[calc(1.25rem+env(safe-area-inset-right))] pb-[calc(1rem+env(safe-area-inset-bottom))] p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-base font-medium text-foreground">Need help today?</p>
          <p className="text-sm text-muted-foreground">From £20/hr</p>
        </div>
        <Button size="lg" className="whitespace-nowrap h-12 px-6 text-base font-medium shadow-sm active:scale-[0.96] transition-transform">
          Book a Butler
        </Button>
      </div>
    </div>
  );
};

export default StickyBookingBar;