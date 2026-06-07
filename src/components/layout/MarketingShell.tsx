import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";

/**
 * Marketing/public page chrome: fixed Header, content offset below it, Footer.
 * Shared by the membership, pay-as-you-go, and join segment layouts so the
 * chrome stays consistent. (The /butlers layout deliberately omits the pt-20
 * offset because its page renders its own hero background.)
 */
export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="pt-20">{children}</main>
      <Footer />
    </>
  );
}
