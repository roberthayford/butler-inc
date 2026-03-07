import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const serif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

const SITE_URL = "https://butlersinc.com";

export const metadata: Metadata = {
  title: "Butlers Inc. | Premium Concierge Service — Coming Soon",
  description:
    "Premium personal concierge service across England. Same-day couriers, childcare, luxury sourcing, property management, and bespoke requests. From £35/hr. Launching soon.",
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: "Butlers Inc. | Premium Concierge Service — Coming Soon",
    description:
      "The new standard in premium concierge across England. Six specialist butler services from £35/hr.",
    url: SITE_URL,
    siteName: "Butlers Inc.",
    type: "website",
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title: "Butlers Inc. | Premium Concierge — Coming Soon",
    description:
      "Premium personal concierge across England. Six specialist butler services from £35/hr.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "Butlers Inc.",
      url: SITE_URL,
      email: "hello@butlersinc.com",
      description:
        "Premium personal concierge service across England offering same-day couriers, childcare, luxury sourcing, property management, and bespoke requests.",
      areaServed: {
        "@type": "Country",
        name: "England",
      },
    },
    {
      "@type": "WebSite",
      name: "Butlers Inc.",
      url: SITE_URL,
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
