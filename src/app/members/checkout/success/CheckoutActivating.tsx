"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const POLL_INTERVAL_MS = 800;
const MAX_DURATION_MS = 10_000;

export function CheckoutActivating() {
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const start = Date.now();
    const tick = async () => {
      try {
        const res = await fetch("/api/members/me");
        if (res.ok) {
          const body = await res.json();
          if (body?.membership?.status === "active") {
            router.push("/members/dashboard?welcome=1");
            return;
          }
        }
      } catch { /* swallow — keep polling */ }

      if (Date.now() + POLL_INTERVAL_MS - start >= MAX_DURATION_MS) {
        setTimedOut(true);
        return;
      }
      window.setTimeout(tick, POLL_INTERVAL_MS);
    };
    tick();
  }, [router]);

  if (timedOut) {
    return (
      <div className="text-center">
        <p className="text-optical-white text-lg mb-2">Taking longer than usual. Your membership should appear shortly.</p>
        <Link href="/members/dashboard" className="text-brass-text underline">Go to dashboard</Link>
      </div>
    );
  }
  return (
    <div className="text-center">
      <p className="text-optical-white text-lg">Activating your membership…</p>
    </div>
  );
}
