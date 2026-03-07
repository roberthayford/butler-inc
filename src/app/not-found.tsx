import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-charcoal">
      <h1 className="text-6xl font-serif font-bold text-optical-white tracking-tight mb-4">
        404
      </h1>
      <p className="text-xl text-warm-gray mb-8">
        This page doesn&apos;t exist.
      </p>
      <Link
        href="/"
        className="px-6 py-3 bg-brass text-charcoal rounded-sm font-medium hover:bg-brass-muted transition-colors"
      >
        Back to Home
      </Link>
    </div>
  );
}
