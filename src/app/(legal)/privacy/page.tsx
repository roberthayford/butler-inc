import type { Metadata } from "next";
import { LegalPolicyPage } from "@/components/LegalPolicyPage";
import { legalPolicies } from "@/data/legal-policies";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPage() {
  return <LegalPolicyPage policy={legalPolicies.privacy} />;
}
