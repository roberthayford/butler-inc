import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const metadata: Metadata = {
  title: "ICO Membership",
};

export default function IcoPage() {
  return (
    <PlaceholderPage
      title="ICO Membership"
      subtitle="Registration in progress."
      body="Check back shortly."
    />
  );
}
