import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-charcoal flex items-center justify-center px-6 py-24">
      <div className="max-w-xl text-center">
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-optical-white mb-6">
          Terms of Service
        </h1>
        <p className="text-lg md:text-xl text-optical-white/90 font-serif italic mb-3">
          Our legal team is pressing the fine print.
        </p>
        <p className="text-warm-gray text-sm">
          This page will be updated shortly with our full policy.
        </p>
      </div>
    </main>
  );
}
