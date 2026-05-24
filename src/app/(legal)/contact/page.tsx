import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const metadata: Metadata = {
  title: "Contact Us",
};

export default function ContactPage() {
  return (
    <PlaceholderPage
      title="Contact Us"
      subtitle="Our line will be open soon."
      body="Check back shortly."
    />
  );
}
