"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { phoneNumberSchema } from "@/lib/phone";
import { PlanManager } from "@/components/membership/PlanManager";
import { consumePortalSnapshot, diffSnapshot, type Snapshot } from "@/lib/membership/portal-snapshot";
import { useMembership } from "@/hooks/useMembership";
import { useQueryClient } from "@tanstack/react-query";

const profileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: phoneNumberSchema,
});

type ProfileForm = z.infer<typeof profileSchema>;

export default function SettingsPage() {
  const { user, loading, supabase } = useAuth();
  const router = useRouter();
  const { membership } = useMembership();
  const queryClient = useQueryClient();
  const userId = user?.id;
  const userName = (user?.user_metadata?.name as string) ?? "";
  const userPhone = (user?.user_metadata?.phone as string) ?? "";

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: userName,
      phone: userPhone,
    },
  });
  const { reset: resetProfileForm } = profileForm;

  // Email state
  const [newEmail, setNewEmail] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);

  // Password state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  // IMPORTANT: this useEffect must be declared BEFORE the early returns below.
  // When auth flips from loading=true → loading=false the early-return path
  // skips the useEffect on the first render and includes it on the second,
  // tripping React #310 ("Rendered more hooks than during the previous render")
  // in production builds.
  useEffect(() => {
    if (userId) {
      resetProfileForm({
        name: userName,
        phone: userPhone,
      });
    }
  }, [resetProfileForm, userId, userName, userPhone]);

  // Redirect unauthenticated users — must be in an effect, not during render.
  // Calling router.push() synchronously during render trips React's
  // "Cannot update a component while rendering a different component" warning
  // and is a Rules-of-React violation. The hook is declared above the early
  // returns to keep the hook list stable across loading flips (React #310).
  useEffect(() => {
    if (!loading && !user) {
      router.push("/members/login");
    }
  }, [loading, user, router]);

  // Refs that mirror the latest membership and user id so the polling loop
  // below can read fresh values without re-creating the effect (the loop
  // intentionally has stable scheduling; we just want each tick to see the
  // most recent data after React Query refetches).
  const membershipRef = useRef(membership);
  membershipRef.current = membership;
  const userIdRef = useRef(user?.id);
  userIdRef.current = user?.id;

  // Portal-return diff toast — also declared before early returns per React #310.
  //
  // Implementation notes (each fixes a distinct bug found in code review):
  // 1. Snapshot is consumed in its own effect that runs once on mount and
  //    stashes the result in a ref. The polling effect then waits for
  //    `membership` to be available before starting — so a slow membership
  //    fetch no longer destroys the snapshot.
  // 2. Polling depends on `Boolean(membership)` (stable boolean), not the
  //    membership object itself, so it starts exactly once when membership
  //    first becomes available and isn't torn down on every refetch.
  // 3. `tick()` reads membership via `membershipRef.current` — fresh on
  //    every iteration, not the stale closure capture.
  // 4. The user id used in `invalidateQueries` reads from `userIdRef.current`,
  //    matching whatever the real React Query key currently is.
  // 5. The effect returns a cleanup that cancels any in-flight setTimeout
  //    so orphan ticks don't fire after the component unmounts.
  const snapshotRef = useRef<Snapshot | null>(null);
  const snapshotConsumedRef = useRef(false);
  const pollStartedRef = useRef(false);

  useEffect(() => {
    if (snapshotConsumedRef.current) return;
    snapshotConsumedRef.current = true;
    snapshotRef.current = consumePortalSnapshot();
  }, []);

  useEffect(() => {
    const snap = snapshotRef.current;
    if (!snap) return;
    if (!membership) return;
    if (pollStartedRef.current) return;
    pollStartedRef.current = true;

    let attempts = 0;
    const MAX = 6;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = () => {
      if (cancelled) return;
      const m = membershipRef.current;
      if (!m) {
        timer = setTimeout(tick, 800);
        return;
      }
      const curr: Snapshot = {
        status: m.status,
        tierSlug: m.tier.slug,
        cancelAtPeriodEnd: m.cancelAtPeriodEnd,
      };
      const diff = diffSnapshot(snap, curr);
      if (diff.kind === "plan_changed") {
        toast.success(`Plan changed to ${curr.tierSlug}`);
        return;
      }
      if (diff.kind === "cancel_scheduled") {
        toast.success(`Cancellation scheduled for ${new Date(m.billingPeriodEnd).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`);
        return;
      }
      if (diff.kind === "cancel_reversed") {
        toast.success("Cancellation reversed");
        return;
      }
      if (diff.kind === "cancelled") {
        toast.success("Membership cancelled");
        return;
      }
      attempts += 1;
      if (attempts >= MAX) {
        toast.info("We've updated your subscription. Check your email for confirmation.");
        return;
      }
      const uid = userIdRef.current;
      if (uid) queryClient.invalidateQueries({ queryKey: ["membership", uid] });
      timer = setTimeout(tick, 800);
    };
    tick();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    // Boolean(membership) flips false→true exactly once when the React Query
    // first resolves; subsequent refetches don't change this and so don't
    // re-trigger the effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(membership)]);

  if (loading) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <p className="text-warm-gray">Loading...</p>
      </div>
    );
  }

  if (!user) {
    // The redirect is dispatched from the useEffect above. Render nothing
    // while the navigation kicks in.
    return null;
  }

  const handleProfileSave = async (data: ProfileForm) => {
    try {
      const response = await fetch("/api/members/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json();
        const phoneError = result?.details?.fieldErrors?.phone?.[0];
        throw new Error(phoneError ?? result?.error ?? "Failed to update profile");
      }

      toast.success("Profile updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update profile");
    }
  };

  const handleEmailSave = async () => {
    if (!newEmail.trim()) return;
    setEmailSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      toast.success("Check your new email to confirm the change");
      setNewEmail("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update email");
    } finally {
      setEmailSaving(false);
    }
  };

  const handlePasswordSave = async () => {
    setPasswordError("");
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }
    setPasswordSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Password updated");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update password");
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-charcoal">
      <div className="max-w-xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-serif font-bold text-optical-white tracking-tight mb-8">
          Account Settings
        </h1>

        {/* Plan Section */}
        <section className="bg-primary-foreground/5 border border-primary-foreground/10 rounded-sm p-6 mb-6">
          <h2 className="text-lg font-serif font-semibold text-optical-white mb-4">Plan</h2>
          <PlanManager />
        </section>

        {/* Profile Section */}
        <section className="bg-primary-foreground/5 border border-primary-foreground/10 rounded-sm p-6 mb-6">
          <h2 className="text-lg font-serif font-semibold text-optical-white mb-4">Profile</h2>
          <form onSubmit={profileForm.handleSubmit(handleProfileSave)} className="space-y-4">
            <div>
              <label htmlFor="settings-name" className="block text-sm font-medium text-optical-white mb-1">
                Name
              </label>
              <input
                id="settings-name"
                type="text"
                {...profileForm.register("name")}
                className="w-full bg-primary-foreground/5 border border-primary-foreground/10 rounded-sm p-2 text-optical-white focus:border-brass/40 focus:outline-none"
              />
              {profileForm.formState.errors.name && (
                <p className="text-[#EE4B2B] text-sm mt-1" role="alert">
                  {profileForm.formState.errors.name.message}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="settings-phone" className="block text-sm font-medium text-optical-white mb-1">
                Phone
              </label>
              <input
                id="settings-phone"
                type="tel"
                {...profileForm.register("phone")}
                className="w-full bg-primary-foreground/5 border border-primary-foreground/10 rounded-sm p-2 text-optical-white focus:border-brass/40 focus:outline-none"
              />
              {profileForm.formState.errors.phone && (
                <p className="text-[#EE4B2B] text-sm mt-1" role="alert">
                  {profileForm.formState.errors.phone.message}
                </p>
              )}
            </div>
            <Button
              type="submit"
              disabled={profileForm.formState.isSubmitting}
              className="bg-brass text-charcoal hover:bg-brass-muted disabled:opacity-50"
            >
              {profileForm.formState.isSubmitting ? "Saving..." : "Save"}
            </Button>
          </form>
        </section>

        {/* Email Section */}
        <section className="bg-primary-foreground/5 border border-primary-foreground/10 rounded-sm p-6 mb-6">
          <h2 className="text-lg font-serif font-semibold text-optical-white mb-4">Email</h2>
          <p className="text-warm-gray text-sm mb-3">
            Current email: <span className="text-optical-white">{user.email}</span>
          </p>
          <div className="space-y-4">
            <div>
              <label htmlFor="settings-email" className="block text-sm font-medium text-optical-white mb-1">
                New Email
              </label>
              <input
                id="settings-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Enter new email address"
                className="w-full bg-primary-foreground/5 border border-primary-foreground/10 rounded-sm p-2 text-optical-white placeholder:text-warm-gray/50 focus:border-brass/40 focus:outline-none"
              />
            </div>
            <Button
              onClick={handleEmailSave}
              disabled={emailSaving || !newEmail.trim()}
              className="bg-brass text-charcoal hover:bg-brass-muted disabled:opacity-50"
            >
              {emailSaving ? "Saving..." : "Update Email"}
            </Button>
          </div>
        </section>

        {/* Password Section */}
        <section className="bg-primary-foreground/5 border border-primary-foreground/10 rounded-sm p-6">
          <h2 className="text-lg font-serif font-semibold text-optical-white mb-4">Password</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="settings-new-password" className="block text-sm font-medium text-optical-white mb-1">
                New Password
              </label>
              <input
                id="settings-new-password"
                type="password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setPasswordError("");
                }}
                placeholder="Minimum 6 characters"
                className="w-full bg-primary-foreground/5 border border-primary-foreground/10 rounded-sm p-2 text-optical-white placeholder:text-warm-gray/50 focus:border-brass/40 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="settings-confirm-password" className="block text-sm font-medium text-optical-white mb-1">
                Confirm Password
              </label>
              <input
                id="settings-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setPasswordError("");
                }}
                className="w-full bg-primary-foreground/5 border border-primary-foreground/10 rounded-sm p-2 text-optical-white focus:border-brass/40 focus:outline-none"
              />
            </div>
            {passwordError && (
              <p className="text-[#EE4B2B] text-sm">{passwordError}</p>
            )}
            <Button
              onClick={handlePasswordSave}
              disabled={passwordSaving || !newPassword}
              className="bg-brass text-charcoal hover:bg-brass-muted disabled:opacity-50"
            >
              {passwordSaving ? "Updating..." : "Update Password"}
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
