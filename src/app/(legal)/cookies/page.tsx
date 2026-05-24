import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const metadata: Metadata = {
  title: "Cookie Policy",
};

export default function CookiesPage() {
  return (
    <PlaceholderPage
      title="Cookie Policy"
      subtitle="Tracking the small print."
      body="Check back shortly."
    />
  );
}
