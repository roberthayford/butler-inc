import Link from "next/link";
import { services } from "@/data/services";

export function Footer() {
  return (
    <footer className="bg-charcoal border-t border-primary-foreground/10">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Brand */}
          <div>
            <Link
              href="/"
              className="text-2xl font-serif font-bold text-optical-white"
            >
              Butlers Inc.
            </Link>
            <p className="text-warm-gray text-sm mt-3 max-w-xs leading-relaxed">
              Premium concierge service across England. Your personal butler, on
              demand.
            </p>
            <p className="text-warm-gray text-sm mt-4">
              <a
                href="mailto:hello@butlersinc.com"
                className="hover:text-brass-text transition-colors"
              >
                hello@butlersinc.com
              </a>
            </p>
          </div>

          {/* Butlers */}
          <div>
            <h4 className="text-optical-white font-semibold mb-4">
              Our Butlers
            </h4>
            <ul className="space-y-2">
              {services.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/butlers/${s.id}`}
                    className="text-warm-gray text-sm hover:text-brass-text transition-colors"
                  >
                    {s.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-optical-white font-semibold mb-4">Legal</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/privacy"
                  className="text-warm-gray text-sm hover:text-brass-text transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-warm-gray text-sm hover:text-brass-text transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-primary-foreground/10 text-center">
          <p className="text-warm-gray text-sm">
            &copy; {new Date().getFullYear()} Butlers Inc. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
