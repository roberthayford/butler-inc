import type { Metadata } from "next";
import { LegalPolicyPage } from "@/components/LegalPolicyPage";
import { legalPolicies } from "@/data/legal-policies";

export const metadata: Metadata = {
  title: "Refund Policy",
};

export default function RefundPage() {
  return <LegalPolicyPage policy={legalPolicies.refund} />;
}
