"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { SignInForm } from "@/components/auth/SignInForm";
import { TierComparison } from "@/components/membership/TierComparison";

/**
 * Combined "Members" entry: sign in (existing members) or become a member
 * (pricing). Lives outside /members/* so it does not inherit that segment's
 * authed layout (MembershipBanner / WelcomeBanner). Signed-in users are sent
 * to their dashboard.
 */
export function JoinPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/members/dashboard");
    }
  }, [loading, user, router]);

  if (loading || user) return null;

  return (
    <div className="bg-charcoal">
      <section className="px-4 pt-12 pb-16">
        <div className="w-full max-w-md mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-serif font-bold text-optical-white tracking-tight">
              Members
            </h1>
            <p className="text-warm-gray mt-2">
              Sign in to your Butlers Inc. account
            </p>
          </div>

          <div className="bg-primary-foreground/5 border border-primary-foreground/10 backdrop-blur-sm rounded-sm p-8">
            <SignInForm />
          </div>
        </div>
      </section>

      <section className="px-6 pb-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-optical-white text-center mb-4 tracking-tight">
            Become a member
          </h2>
          <p className="text-warm-gray text-center mb-12 max-w-2xl mx-auto leading-relaxed">
            A flat £50 per hour, no urgency surcharges, and a prepaid monthly
            allowance of butler hours and Virtual Butler tasks.
          </p>
          <TierComparison />
        </div>
      </section>

      <div className="text-center pb-16">
        <Link
          href="/"
          className="text-warm-gray text-sm hover:text-optical-white transition-colors"
        >
          &larr; Back to home
        </Link>
      </div>
    </div>
  );
}
