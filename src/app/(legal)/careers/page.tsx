import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const metadata: Metadata = {
  title: "Careers",
};

export default function CareersPage() {
  return (
    <PlaceholderPage
      title="Careers"
      subtitle="We're hiring soon, quietly first."
      body="Check back shortly."
    />
  );
}
