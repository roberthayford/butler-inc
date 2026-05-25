"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { phoneNumberSchema } from "@/lib/phone";
import { PlanManager } from "@/components/membership/PlanManager";

const profileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: phoneNumberSchema,
});

type ProfileForm = z.infer<typeof profileSchema>;

export default function SettingsPage() {
  const { user, loading, supabase } = useAuth();
  const router = useRouter();
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

  if (loading) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <p className="text-warm-gray">Loading...</p>
      </div>
    );
  }

  if (!user) {
    router.push("/members/login");
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
        {/* Back nav */}
        <Link
          href="/members/dashboard"
          className="text-warm-gray text-sm hover:text-optical-white transition-colors mb-6 inline-block"
        >
          &larr; Back to Dashboard
        </Link>

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
