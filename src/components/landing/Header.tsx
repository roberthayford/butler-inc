"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Menu, X } from "lucide-react";

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, loading } = useAuth();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`
        fixed top-0 left-0 right-0 z-50 transition-all duration-300
        ${scrolled ? "bg-charcoal/95 backdrop-blur-md shadow-lg" : "bg-transparent"}
      `}
    >
      <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-2xl font-serif font-bold text-optical-white">
          Butlers Inc.
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          <Link
            href="/butlers"
            className="text-optical-white/80 hover:text-optical-white transition-colors text-sm"
          >
            Our Butlers
          </Link>
          {loading ? null : user ? (
            <Link
              href="/members/dashboard"
              className="text-sm px-4 py-2 rounded-lg bg-brass text-charcoal hover:bg-brass-muted transition-colors"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/members/login"
                className="text-optical-white/80 hover:text-optical-white transition-colors text-sm"
              >
                Log in
              </Link>
              <Link
                href="/members/signup"
                className="text-sm px-4 py-2 rounded-lg bg-brass text-charcoal hover:bg-brass-muted transition-colors"
              >
                Join
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen((prev) => !prev)}
          className="md:hidden text-optical-white"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-charcoal/95 backdrop-blur-md border-t border-primary-foreground/10 px-6 py-4 space-y-3">
          <Link
            href="/butlers"
            className="block text-optical-white/80 hover:text-optical-white py-2"
            onClick={() => setMobileOpen(false)}
          >
            Our Butlers
          </Link>
          {loading ? null : user ? (
            <Link
              href="/members/dashboard"
              className="block text-brass hover:text-brass-muted py-2"
              onClick={() => setMobileOpen(false)}
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/members/login"
                className="block text-optical-white/80 hover:text-optical-white py-2"
                onClick={() => setMobileOpen(false)}
              >
                Log in
              </Link>
              <Link
                href="/members/signup"
                className="block text-brass hover:text-brass-muted py-2"
                onClick={() => setMobileOpen(false)}
              >
                Join
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
