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
      <MembershipBanner />
      <Suspense fallback={null}>
        <WelcomeBanner />
      </Suspense>
      <main className="pt-2">{children}</main>
      <Footer />
    </>
  );
}
