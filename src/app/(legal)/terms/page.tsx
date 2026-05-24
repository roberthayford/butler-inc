import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const metadata: Metadata = {
  title: "Terms and Conditions",
};

export default function TermsPage() {
  return (
    <PlaceholderPage
      title="Terms and Conditions"
      subtitle="Our legal team is pressing the fine print."
      body="Check back shortly."
    />
  );
}
