import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const metadata: Metadata = {
  title: "About Us",
};

export default function AboutPage() {
  return (
    <PlaceholderPage
      title="About Us"
      subtitle="The story is still being told."
      body="Check back shortly."
    />
  );
}
