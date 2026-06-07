import { Button, Text } from "@react-email/components";
import { MembershipEmailLayout } from "./components/MembershipEmailLayout";

export interface WelcomeEmailProps {
  name: string;
  tierName: string;
  hoursTotal: number;
  tasksTotal: number;
  renewsAt: string;
  /** Amount charged for the first month, in pounds. Serves as the initial receipt. */
  monthlyPrice: number;
}

export function WelcomeEmail({ name, tierName, hoursTotal, tasksTotal, renewsAt, monthlyPrice }: WelcomeEmailProps) {
  const greetingName = name.split(" ")[0] ?? name;
  const amount = `£${monthlyPrice.toLocaleString("en-GB")}`;
  return (
    <MembershipEmailLayout
      preview={`Payment received. Your ${hoursTotal} hours are ready.`}
      heading={`Welcome to Butlers Inc ${tierName}`}
    >
      <Text style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: "15px", color: "#4A5568", lineHeight: "1.6", margin: "0 0 18px" }}>
        {`Hello ${greetingName}, your ${tierName} membership is active and your first payment of ${amount} has been received. You have ${hoursTotal} personal butler hours and ${tasksTotal} Virtual Butler tasks available this period. Renews on ${renewsAt}.`}
      </Text>
      <Button
        href="https://butlersinc.com/members/dashboard"
        style={{ backgroundColor: "#B3895D", color: "#FCFBF9", padding: "12px 20px", borderRadius: "4px", fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: "14px", textDecoration: "none" }}
      >
        Book your first butler
      </Button>
    </MembershipEmailLayout>
  );
}

WelcomeEmail.PreviewProps = {
  name: "Ada Lovelace", tierName: "Lite", hoursTotal: 10, tasksTotal: 5, renewsAt: "25 Jun 2026", monthlyPrice: 500,
} satisfies WelcomeEmailProps;

export default WelcomeEmail;
