"use client";

import Link from "next/link";
import { SignInForm } from "@/components/auth/SignInForm";

export function LoginPage() {
  return (
    <div className="min-h-screen bg-charcoal flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif font-bold text-optical-white tracking-tight">
            Welcome Back
          </h1>
          <p className="text-warm-gray mt-2">
            Sign in to your Butlers Inc. account
          </p>
        </div>

        <div className="bg-primary-foreground/5 border border-primary-foreground/10 backdrop-blur-sm rounded-sm p-8">
          <SignInForm />
        </div>

        <div className="text-center mt-6">
          <Link
            href="/"
            className="text-warm-gray text-sm hover:text-optical-white transition-colors"
          >
            &larr; Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
