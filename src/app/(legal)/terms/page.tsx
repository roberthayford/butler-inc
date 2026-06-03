import type { Metadata } from "next";
import { LegalPolicyPage } from "@/components/LegalPolicyPage";
import { legalPolicies } from "@/data/legal-policies";

export const metadata: Metadata = {
  title: "Terms and Conditions",
};

export default function TermsPage() {
  return <LegalPolicyPage policy={legalPolicies.terms} />;
}
