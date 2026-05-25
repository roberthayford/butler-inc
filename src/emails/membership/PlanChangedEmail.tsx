import { Button, Text } from "@react-email/components";
import { MembershipEmailLayout } from "./components/MembershipEmailLayout";

export interface PlanChangedEmailProps {
  name: string;
  fromTierName: string;
  toTierName: string;
  newHoursTotal: number;
  renewsAt: string;
}

export function PlanChangedEmail({ name, fromTierName, toTierName, newHoursTotal, renewsAt }: PlanChangedEmailProps) {
  const first = name.split(" ")[0] ?? name;
  return (
    <MembershipEmailLayout
      preview={`Your ${toTierName} benefits are active now.`}
      heading={`Your plan changed: ${fromTierName} to ${toTierName}`}
    >
      <Text style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: "15px", color: "#4A5568", lineHeight: "1.6", margin: "0 0 18px" }}>
        {`Hello ${first}, your membership changed from ${fromTierName} to ${toTierName}. Your new hours allowance is ${newHoursTotal} (effective immediately, prorated by Stripe). Renews on ${renewsAt}.`}
      </Text>
      <Button
        href="https://butlersinc.com/members/dashboard"
        style={{ backgroundColor: "#B3895D", color: "#FCFBF9", padding: "12px 20px", borderRadius: "4px", fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: "14px", textDecoration: "none" }}
      >
        View dashboard
      </Button>
    </MembershipEmailLayout>
  );
}

PlanChangedEmail.PreviewProps = {
  name: "Ada", fromTierName: "Lite", toTierName: "Pro", newHoursTotal: 55, renewsAt: "25 Jun 2026",
} satisfies PlanChangedEmailProps;

export default PlanChangedEmail;
