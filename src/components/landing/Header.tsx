"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "@/context/AuthContext";
import { isAdmin } from "@/lib/admin";
import { useSignOutFlow } from "@/hooks/useSignOutFlow";
import { Menu, X } from "lucide-react";
import { AccountMenu } from "./AccountMenu";

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, loading } = useAuth();
  const showAdmin = !loading && user && isAdmin(user.email ?? undefined);
  const pathname = usePathname();
  const suppressAuthCTAs = pathname === "/members/login" || pathname === "/members/signup";
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Focus trap: close mobile menu on Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileOpen) {
        setMobileOpen(false);
        toggleRef.current?.focus();
      }
    },
    [mobileOpen]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <>
      <header
        className={`
          fixed top-0 left-0 right-0 z-[100] transition-all duration-300 will-change-[background-color,backdrop-filter]
          ${scrolled ? "bg-charcoal/95 backdrop-blur-md shadow-lg" : "bg-transparent"}
        `}
      >
        <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="text-2xl font-serif font-bold text-optical-white"
          >
            Butlers Inc.
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className="text-optical-white/80 hover:text-optical-white transition-colors text-sm"
            >
              Home
            </Link>
            <Link
              href="/butlers"
              className="text-optical-white/80 hover:text-optical-white transition-colors text-sm"
            >
              Our Butlers
            </Link>
            {loading ? null : user ? (
              <AccountMenu />
            ) : suppressAuthCTAs ? null : (
              <>
                <Link
                  href="/members/login"
                  className="text-optical-white/80 hover:text-optical-white transition-colors text-sm"
                >
                  Sign In
                </Link>
                <Link
                  href="/membership"
                  className="text-sm px-4 py-2 rounded-sm bg-brass text-charcoal hover:bg-brass-muted transition-colors"
                >
                  Join
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger — 44x44 touch target */}
          <button
            ref={toggleRef}
            onClick={() => setMobileOpen((prev) => !prev)}
            className="md:hidden p-2 -mr-2 text-optical-white rounded-sm focus-visible:outline-2 focus-visible:outline-brass"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </nav>

        {/* Mobile menu with slide animation */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              ref={menuRef}
              id="mobile-menu"
              role="navigation"
              aria-label="Mobile navigation"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="md:hidden bg-charcoal/95 backdrop-blur-md border-t border-primary-foreground/10 overflow-hidden"
            >
              <div className="px-6 py-4 space-y-1">
                <Link
                  href="/"
                  className="block text-optical-white/80 hover:text-optical-white py-3"
                  onClick={() => setMobileOpen(false)}
                >
                  Home
                </Link>
                <Link
                  href="/butlers"
                  className="block text-optical-white/80 hover:text-optical-white py-3"
                  onClick={() => setMobileOpen(false)}
                >
                  Our Butlers
                </Link>
                {loading ? null : user ? (
                  <MobileAccountSection
                    showAdmin={!!showAdmin}
                    onItemClick={() => setMobileOpen(false)}
                  />
                ) : suppressAuthCTAs ? null : (
                  <>
                    <Link
                      href="/members/login"
                      className="block text-optical-white/80 hover:text-optical-white py-3"
                      onClick={() => setMobileOpen(false)}
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/membership"
                      className="block text-brass-text hover:text-brass-muted py-3"
                      onClick={() => setMobileOpen(false)}
                    >
                      Join
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}

function MobileAccountSection({
  showAdmin,
  onItemClick,
}: {
  showAdmin: boolean;
  onItemClick: () => void;
}) {
  const runSignOut = useSignOutFlow();

  const handleSignOut = async () => {
    onItemClick();
    await runSignOut();
  };

  return (
    <>
      <Link
        href="/members/dashboard"
        className="block text-brass-text hover:text-brass-muted py-3"
        onClick={onItemClick}
      >
        Dashboard
      </Link>
      <Link
        href="/members/settings"
        className="block text-optical-white/80 hover:text-optical-white py-3"
        onClick={onItemClick}
      >
        Settings
      </Link>
      {showAdmin && (
        <Link
          href="/admin"
          className="block text-optical-white/80 hover:text-optical-white py-3"
          onClick={onItemClick}
        >
          Admin
        </Link>
      )}
      <button
        type="button"
        onClick={handleSignOut}
        className="block w-full text-left text-optical-white/80 hover:text-optical-white py-3"
      >
        Sign Out
      </button>
    </>
  );
}
