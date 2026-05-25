"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const COOLDOWN_SECONDS = 30;

interface Props {
  email: string | null;
  next?: string | null;
}

export function ResendVerificationButton({ email, next }: Props) {
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
    const supabase = createClient();
    const emailRedirectTo = next
      ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
      : `${window.location.origin}/auth/callback`;
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email!,
        options: { emailRedirectTo },
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Verification email sent");
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
      {onCooldown ? `Resend in ${remainingSeconds}s` : "Resend verification email"}
    </Button>
  );
}
