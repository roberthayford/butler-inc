import Header from "@/components/landing/Header";
import Hero from "@/components/landing/Hero";
import ServiceSelector from "@/components/landing/ServiceSelector";
import HowItWorks from "@/components/landing/HowItWorks";
import Differentiators from "@/components/landing/Differentiators";
import ServiceDetails from "@/components/landing/ServiceDetails";
import Membership from "@/components/landing/Membership";
import TrustSafety from "@/components/landing/TrustSafety";
import Testimonials from "@/components/landing/Testimonials";
import FAQ from "@/components/landing/FAQ";
import Footer from "@/components/landing/Footer";
import StickyBookingBar from "@/components/landing/StickyBookingBar";

const Index = () => {
  return (
    <main className="min-h-screen">
      <Header />
      <Hero />
      <ServiceSelector />
      <HowItWorks />
      <Differentiators />
      <ServiceDetails />
      <Membership />
      <TrustSafety />
      <Testimonials />
      <FAQ />
      <Footer />
      <StickyBookingBar />
    </main>
  );
};

export default Index;