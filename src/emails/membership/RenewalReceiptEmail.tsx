import { Text } from "@react-email/components";
import { MembershipEmailLayout } from "./components/MembershipEmailLayout";

export interface RenewalReceiptEmailProps {
  name: string;
  tierName: string;
  monthlyPrice: number;
  hoursTotal: number;
  tasksTotal: number;
  periodEnd: string;
}

export function RenewalReceiptEmail({ name, tierName, monthlyPrice, hoursTotal, tasksTotal, periodEnd }: RenewalReceiptEmailProps) {
  const first = name.split(" ")[0] ?? name;
  return (
    <MembershipEmailLayout
      preview={`£${monthlyPrice} charged. Hours refreshed.`}
      heading={`Your Butlers Inc ${tierName} has renewed`}
    >
      <Text style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: "15px", color: "#4A5568", lineHeight: "1.6", margin: "0 0 12px" }}>
        {`Hello ${first}, your ${tierName} membership renewed today. £${monthlyPrice} was charged to the card on file. Your ${hoursTotal} personal butler hours and ${tasksTotal} virtual tasks are refreshed for the new period (ends ${periodEnd}).`}
      </Text>
    </MembershipEmailLayout>
  );
}

RenewalReceiptEmail.PreviewProps = {
  name: "Ada", tierName: "Frequent", monthlyPrice: 1000, hoursTotal: 20, tasksTotal: 10, periodEnd: "25 Jul 2026",
} satisfies RenewalReceiptEmailProps;

export default RenewalReceiptEmail;
