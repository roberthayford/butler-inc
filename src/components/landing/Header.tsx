import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 pt-[env(safe-area-inset-top)] ${isScrolled ? "bg-background/95 backdrop-blur-sm shadow-sm" : "bg-transparent"
        }`}
    >
      <nav className="max-w-7xl mx-auto pl-[calc(1.25rem+env(safe-area-inset-left))] pr-[calc(1.25rem+env(safe-area-inset-right))] md:px-8 py-4 flex items-center justify-between">
        <a href="/" className="flex items-center">
          <img
            src="/images/butlers-inc-logo.webp"
            alt="Butlers Inc."
            className="h-9 md:h-11 w-auto"
          />
        </a>
        <div className="flex items-center gap-3">
          <a
            href="#"
            className="text-sm font-medium text-muted-foreground/60 hover:text-foreground transition-colors hidden md:block"
          >
            Log in
          </a>
          <Button variant="outline" size="sm" className="font-medium">
            Join
          </Button>
        </div>
      </nav>
    </header>
  );
};

export default Header;