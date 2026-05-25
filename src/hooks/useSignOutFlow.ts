"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

export function useSignOutFlow() {
  const { signOut } = useAuth();
  const router = useRouter();
  return useCallback(async () => {
    try {
      await signOut();
      toast.success("Signed out");
      router.push("/");
    } catch {
      toast.error("Sign out failed. Try again.");
    }
  }, [signOut, router]);
}
