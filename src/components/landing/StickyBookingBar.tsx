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

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-t border-border shadow-lg md:hidden">
      <div className="pl-[calc(1.25rem+env(safe-area-inset-left))] pr-[calc(1.25rem+env(safe-area-inset-right))] py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-foreground">Need help today?</p>
          <p className="text-xs text-muted-foreground">From £20/hr</p>
        </div>
        <Button size="default" className="whitespace-nowrap">
          Book a Butler
        </Button>
      </div>
    </div>
  );
};

export default StickyBookingBar;