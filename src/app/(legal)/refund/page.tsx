import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const metadata: Metadata = {
  title: "Refund Policy",
};

export default function RefundPage() {
  return (
    <PlaceholderPage
      title="Refund Policy"
      subtitle="Refunds, written precisely."
      body="Check back shortly."
    />
  );
}
