"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function SettingsPage() {
  const { user, loading, supabase } = useAuth();
  const router = useRouter();

  // Profile state
  const [name, setName] = useState(user?.user_metadata?.name ?? "");
  const [phone, setPhone] = useState(user?.user_metadata?.phone ?? "");
  const [profileSaving, setProfileSaving] = useState(false);

  // Email state
  const [newEmail, setNewEmail] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);

  // Password state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

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

  const handleProfileSave = async () => {
    setProfileSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { name, phone },
      });
      if (error) throw error;
      toast.success("Profile updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update profile");
    } finally {
      setProfileSaving(false);
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

        {/* Profile Section */}
        <section className="bg-primary-foreground/5 border border-primary-foreground/10 rounded-sm p-6 mb-6">
          <h2 className="text-lg font-serif font-semibold text-optical-white mb-4">Profile</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="settings-name" className="block text-sm font-medium text-optical-white mb-1">
                Name
              </label>
              <input
                id="settings-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-primary-foreground/5 border border-primary-foreground/10 rounded-sm p-2 text-optical-white focus:border-brass/40 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="settings-phone" className="block text-sm font-medium text-optical-white mb-1">
                Phone
              </label>
              <input
                id="settings-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-primary-foreground/5 border border-primary-foreground/10 rounded-sm p-2 text-optical-white focus:border-brass/40 focus:outline-none"
              />
            </div>
            <Button
              onClick={handleProfileSave}
              disabled={profileSaving}
              className="bg-brass text-charcoal hover:bg-brass-muted disabled:opacity-50"
            >
              {profileSaving ? "Saving..." : "Save"}
            </Button>
          </div>
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
              <p className="text-red-400 text-sm">{passwordError}</p>
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
