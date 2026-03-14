import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";

import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <main id="main-content">
        <Hero />
      </main>
      <Footer />
    </>
  );
}
