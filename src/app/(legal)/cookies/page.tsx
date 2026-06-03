import type { Metadata } from "next";
import { LegalPolicyPage } from "@/components/LegalPolicyPage";
import { legalPolicies } from "@/data/legal-policies";

export const metadata: Metadata = {
  title: "Cookie Policy",
};

export default function CookiesPage() {
  return <LegalPolicyPage policy={legalPolicies.cookies} />;
}
