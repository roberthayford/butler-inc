"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { useAuth } from "@/context/AuthContext";
import { isAdmin } from "@/lib/admin";
import { useSignOutFlow } from "@/hooks/useSignOutFlow";

function getInitials(user: User): string {
  const name = (user.user_metadata?.name as string | undefined)?.trim();
  if (name) {
    const parts = name.split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0][0].toUpperCase();
  }
  return (user.email?.[0] ?? "?").toUpperCase();
}

export function AccountMenu() {
  const { user } = useAuth();
  const runSignOut = useSignOutFlow();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current && !menuRef.current.contains(target) &&
        triggerRef.current && !triggerRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };

    const handleEscape = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  if (!user) return null;

  const handleSignOut = async () => {
    setOpen(false);
    await runSignOut();
  };

  const handleMenuKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]');
    if (!items || items.length === 0) return;
    const current = Array.from(items).findIndex((el) => el === document.activeElement);
    const next =
      e.key === "ArrowDown"
        ? current < items.length - 1 ? current + 1 : 0
        : current > 0 ? current - 1 : items.length - 1;
    items[next].focus();
  };

  const showAdmin = isAdmin(user.email ?? undefined);

  return (
    <div className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="shrink-0 inline-flex items-center justify-center w-9 h-9 aspect-square rounded-full border border-brass/60 bg-charcoal text-brass-text text-sm font-medium leading-none hover:bg-brass/10 transition-colors focus-visible:outline-2 focus-visible:outline-brass"
      >
        {getInitials(user)}
      </button>
      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Account menu"
          onKeyDown={handleMenuKeyDown}
          className="absolute right-0 mt-2 w-48 bg-charcoal border border-primary-foreground/15 rounded-sm shadow-lg py-1 z-[110]"
        >
          <Link
            href="/members/dashboard"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-optical-white hover:bg-primary-foreground/10 focus:bg-primary-foreground/10 focus:outline-none"
          >
            Dashboard
          </Link>
          <Link
            href="/members/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-optical-white hover:bg-primary-foreground/10 focus:bg-primary-foreground/10 focus:outline-none"
          >
            Settings
          </Link>
          {showAdmin && (
            <Link
              href="/admin"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-optical-white hover:bg-primary-foreground/10 focus:bg-primary-foreground/10 focus:outline-none"
            >
              Admin
            </Link>
          )}
          <div className="my-1 border-t border-primary-foreground/10" />
          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            className="block w-full text-left px-4 py-2 text-sm text-optical-white hover:bg-primary-foreground/10 focus:bg-primary-foreground/10 focus:outline-none"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
