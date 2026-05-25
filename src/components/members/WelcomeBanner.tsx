// src/components/members/WelcomeBanner.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useMembership } from "@/hooks/useMembership";

const KEY = "butlers.welcome.dismissed.v1";

export function WelcomeBanner() {
  const sp = useSearchParams();
  const { membership } = useMembership();
  const [dismissed, setDismissed] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  // Capture the ?welcome=1 flag once at mount. The dashboard page reads the
  // same flag and calls router.replace('/members/dashboard') to strip it
  // after firing the welcome toast — without this latch, the URL change
  // would re-evaluate `sp.get("welcome")` and unmount this banner within a
  // single render cycle, defeating its purpose.
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    setHydrated(true);
    setDismissed(localStorage.getItem(KEY) === "1");
    if (sp?.get("welcome") === "1") setShouldShow(true);
    // Intentionally run once on mount — we WANT the URL strip to be ignored
    // by this banner; visibility is controlled by `shouldShow` + `dismissed`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!hydrated) return null;
  if (!shouldShow) return null;
  if (dismissed) return null;

  const tierName = membership?.tier?.name ?? "Butlers Inc";
  const hours = membership?.tier?.personalHoursIncluded ?? 0;

  function dismiss() {
    localStorage.setItem(KEY, "1");
    setDismissed(true);
  }

  return (
    <div className="max-w-4xl mx-auto px-6 mt-6">
      <div className="border border-brass/50 bg-brass/5 rounded-sm p-6 relative">
        <button
          type="button"
          aria-label="Dismiss welcome"
          onClick={dismiss}
          className="absolute top-3 right-3 text-warm-gray hover:text-optical-white"
        >
          ✕
        </button>
        <h2 className="text-xl font-serif text-optical-white mb-2">Welcome to {tierName}</h2>
        <p className="text-warm-gray text-sm mb-4">
          Your {hours} hours are ready. Here&rsquo;s what to try first:
        </p>
        <ul className="space-y-2 text-sm">
          <li><Link href="/members/personal-butler" className="text-brass-text hover:underline">Book a Personal Butler &rarr;</Link></li>
          <li><Link href="/members/virtual-butler" className="text-brass-text hover:underline">Submit a Virtual Butler task &rarr;</Link></li>
          <li className="text-warm-gray">Genie for urgent requests (sticky bar, bottom-right)</li>
        </ul>
      </div>
    </div>
  );
}
