import type { Metadata } from "next";
import { Suspense } from "react";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { MembershipBanner } from "@/components/members/MembershipBanner";
import { WelcomeBanner } from "@/components/members/WelcomeBanner";

export const metadata: Metadata = {
  title: { default: "Members", template: "%s | Butlers Inc." },
};

export default function MembersLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      {/* pt-20 clears the fixed Header (~80px). Banners live inside main so
          their spacing is additive over pt-20, and the happy-path (no
          banner) still gets the full header clearance. */}
      <main className="pt-20">
        <MembershipBanner />
        <Suspense fallback={null}>
          <WelcomeBanner />
        </Suspense>
        {children}
      </main>
      <Footer />
    </>
  );
}
