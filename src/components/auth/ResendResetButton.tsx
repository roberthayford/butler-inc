"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const COOLDOWN_SECONDS = 30;

interface Props {
  email: string | null;
}

export function ResendResetButton({ email }: Props) {
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);

  useEffect(() => {
    if (remainingSeconds <= 0) return;
    const id = setInterval(() => {
      setRemainingSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [remainingSeconds]);

  if (!email) return null;

  const onCooldown = remainingSeconds > 0;

  async function handleClick() {
    try {
      const response = await fetch("/api/members/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        toast.error("Couldn't resend right now. Please try again.");
        return;
      }
      toast.success("Reset email sent");
      setRemainingSeconds(COOLDOWN_SECONDS);
    } catch {
      toast.error("Couldn't resend right now. Please try again.");
    }
  }

  return (
    <Button
      type="button"
      onClick={handleClick}
      disabled={onCooldown}
      className="w-full bg-brass text-charcoal hover:bg-brass-muted disabled:opacity-60"
    >
      {onCooldown ? `Resend in ${remainingSeconds}s` : "Resend reset email"}
    </Button>
  );
}
