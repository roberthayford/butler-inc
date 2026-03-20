import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { AudienceCTA } from "@/components/landing/AudienceCTA";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { ButlerCategoryGrid } from "@/components/landing/ButlerCategoryGrid";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <main id="main-content">
        <Hero />
        <AudienceCTA />
        <HowItWorks />
        <ButlerCategoryGrid />
      </main>
      <Footer />
    </>
  );
}
