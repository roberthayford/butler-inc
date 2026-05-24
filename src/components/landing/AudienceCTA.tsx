"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { useAuth } from "@/context/AuthContext";
import type { User } from "@supabase/supabase-js";

function getFirstName(user: User): string {
  const fullName = user.user_metadata?.name as string | undefined;
  if (fullName) return fullName.split(" ")[0];
  return user.email?.split("@")[0] ?? "there";
}

export function AudienceCTA({ className }: { className?: string }) {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (user) {
    return (
      <section className={className ?? "bg-charcoal py-12 px-6"}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-4xl mx-auto border-l-2 border-l-brass rounded-sm p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
        >
          <div>
            <p className="text-2xl font-serif font-bold text-optical-white">
              Welcome back, {getFirstName(user)}.
            </p>
            <p className="mt-1 text-warm-gray text-sm">
              Your butler is ready when you are.
            </p>
          </div>
          <Link
            href="/members/dashboard"
            className="shrink-0 px-6 py-3 rounded-sm bg-brass text-charcoal font-medium hover:bg-brass-muted transition-colors text-sm tracking-wide"
          >
            Go to Dashboard
          </Link>
        </motion.div>
      </section>
    );
  }

  return (
    <section className={className ?? "bg-charcoal py-12 px-6"}>
      <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="p-8 flex flex-col gap-6 sm:border-r sm:border-optical-white/15"
        >
          <h2 className="text-2xl font-serif font-bold text-optical-white">
            New to Butlers Inc.?
          </h2>
          <div className="flex flex-col gap-3">
            <Link
              href="/butlers"
              className="px-6 py-3 rounded-sm bg-brass text-charcoal font-medium hover:bg-brass-muted transition-colors text-sm tracking-wide text-center"
            >
              Browse Our Butlers
            </Link>
            <Link
              href="/membership"
              className="px-6 py-3 rounded-sm border border-brass/60 text-brass font-medium hover:border-brass hover:bg-brass/10 transition-colors text-sm tracking-wide text-center"
            >
              Become a member
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.45, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="p-8 flex flex-col gap-6"
        >
          <h2 className="text-2xl font-serif font-bold text-optical-white">
            Already a member?
          </h2>
          <Link
            href="/members/login"
            className="px-6 py-3 rounded-sm border border-optical-white/40 text-optical-white font-medium hover:border-optical-white hover:bg-optical-white/10 transition-colors text-sm tracking-wide"
          >
            Sign In
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
