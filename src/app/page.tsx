import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { ButlerCategoryGrid } from "@/components/landing/ButlerCategoryGrid";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <Hero />
      <ButlerCategoryGrid />
      <Footer />
    </>
  );
}
