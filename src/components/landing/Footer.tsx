import Link from "next/link";
import { services } from "@/data/services";

const linksColA: Array<{ href: string; text: string }> = [
  { href: "/about", text: "About Us" },
  { href: "/terms", text: "Terms and Conditions" },
  { href: "/privacy", text: "Privacy Policy" },
  { href: "/refund", text: "Refund Policy" },
];

const linksColB: Array<{ href: string; text: string }> = [
  { href: "/cookies", text: "Cookie Policy" },
  { href: "/ico", text: "ICO Membership" },
  { href: "/careers", text: "Careers" },
  { href: "/contact", text: "Contact Us" },
  { href: "/faqs", text: "FAQs" },
];

const linkClass =
  "text-warm-gray text-sm hover:text-brass-text transition-colors inline-block py-1.5 md:py-0";

function LinkList({ items }: { items: Array<{ href: string; text: string }> }) {
  return (
    <ul className="space-y-1 md:space-y-2">
      {items.map((item) => (
        <li key={item.href}>
          <Link href={item.href} className={linkClass}>
            {item.text}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function Footer() {
  return (
    <footer className="bg-charcoal border-t border-primary-foreground/10">
      <div className="max-w-6xl mx-auto px-6 py-10 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
          {/* Brand */}
          <div>
            <Link
              href="/"
              className="text-2xl font-serif font-bold text-optical-white"
            >
              Butlers Inc.
            </Link>
            <p className="text-warm-gray text-sm mt-3 max-w-xs leading-relaxed">
              Premium Butler, Concierge Service and Personal Assistant service across the UK and Beyond
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
            <ul className="space-y-1 md:space-y-2">
              {services.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/butlers/${s.id}`}
                    className={linkClass}
                  >
                    {s.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Links column A */}
          <div>
            <LinkList items={linksColA} />
          </div>

          {/* Links column B */}
          <div>
            <LinkList items={linksColB} />
          </div>
        </div>

        <div className="mt-8 pt-6 md:mt-12 md:pt-8 border-t border-primary-foreground/10 text-center">
          <p className="text-warm-gray text-sm">
            &copy; {new Date().getFullYear()} Butlers Inc. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
