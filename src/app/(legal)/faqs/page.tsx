import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const metadata: Metadata = {
  title: "FAQs",
};

export default function FaqsPage() {
  return (
    <PlaceholderPage
      title="FAQs"
      subtitle="Questions, queued."
      body="Check back shortly."
    />
  );
}
