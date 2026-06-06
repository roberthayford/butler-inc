import type { Metadata } from "next";
import Link from "next/link";
import { ResendResetButton } from "@/components/auth/ResendResetButton";

export const metadata: Metadata = {
  title: "Check your email",
};

function firstString(v: string | string[] | undefined): string | null {
  if (Array.isArray(v)) return v[0]?.trim() || null;
  if (typeof v === "string") return v.trim() || null;
  return null;
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ email?: string | string[] }>;
}) {
  const sp = await searchParams;
  const email = firstString(sp.email);

  return (
    <div className="min-h-screen bg-charcoal flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="bg-primary-foreground/5 border border-primary-foreground/10 rounded-sm p-8 space-y-6">
          <h1 className="text-3xl font-serif font-bold text-optical-white tracking-tight text-center">
            Check your email
          </h1>

          <p className="text-warm-gray text-sm leading-relaxed text-center">
            {email ? (
              <>
                We sent a password reset link to{" "}
                <span className="text-optical-white font-medium">{email}</span>.
                Click the link to choose a new password.
              </>
            ) : (
              <>
                We sent a password reset link to your email. Click the link to
                choose a new password.
              </>
            )}
          </p>

          <div className="bg-charcoal/40 border border-primary-foreground/10 rounded-sm p-4">
            <p className="text-warm-gray text-sm">
              Can&rsquo;t find it? Check your junk or spam folder.
            </p>
          </div>

          <ol className="text-warm-gray text-sm space-y-2 list-decimal list-inside marker:text-brass-text marker:font-medium">
            <li>Click the link in the email</li>
            <li>Choose a new password</li>
            <li>You&rsquo;ll land on your dashboard</li>
          </ol>

          <ResendResetButton email={email} />

          <div className="flex flex-col sm:flex-row sm:justify-between gap-3 pt-2 text-sm text-center">
            <Link
              href="/members/forgot-password"
              className="text-warm-gray hover:text-optical-white transition-colors"
            >
              Wrong email? Start over
            </Link>
            <Link
              href="/members/login"
              className="text-brass-text hover:text-brass-muted transition-colors"
            >
              Remembered it? Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
