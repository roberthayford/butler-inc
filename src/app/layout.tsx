import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import { GenieStickyBar } from "@/components/genie/GenieStickyBar";
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

export const metadata: Metadata = {
  title: {
    default: "Butlers Inc. | Premium Concierge Service",
    template: "%s | Butlers Inc.",
  },
  description:
    "Your personal butler, on demand. Across England. From £50/hr.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} dark`} suppressHydrationWarning>
      <body className="antialiased">
          <Providers>
            {children}
            <GenieStickyBar />
          </Providers>
        </body>
    </html>
  );
}
