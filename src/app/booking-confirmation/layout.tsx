import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";

export default function BookingConfirmationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="pt-20">{children}</main>
      <Footer />
    </>
  );
}
