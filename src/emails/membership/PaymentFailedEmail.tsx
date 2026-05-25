import { Button, Text } from "@react-email/components";
import { MembershipEmailLayout } from "./components/MembershipEmailLayout";

export interface PaymentFailedEmailProps {
  name: string;
  tierName: string;
}

export function PaymentFailedEmail({ name, tierName }: PaymentFailedEmailProps) {
  const first = name.split(" ")[0] ?? name;
  return (
    <MembershipEmailLayout
      preview="Update your card to keep your benefits."
      heading={`Action needed: payment failed for your Butlers Inc ${tierName}`}
    >
      <Text style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: "15px", color: "#4A5568", lineHeight: "1.6", margin: "0 0 18px" }}>
        {`Hello ${first}, we couldn't charge your card for your ${tierName} membership. Your member benefits are paused until your payment method is updated. We'll retry automatically over the next few days.`}
      </Text>
      <Button
        href="https://butlersinc.com/members/settings"
        style={{ backgroundColor: "#B3895D", color: "#FCFBF9", padding: "12px 20px", borderRadius: "4px", fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: "14px", textDecoration: "none" }}
      >
        Update payment method
      </Button>
    </MembershipEmailLayout>
  );
}

PaymentFailedEmail.PreviewProps = { name: "Ada", tierName: "Pro" } satisfies PaymentFailedEmailProps;
export default PaymentFailedEmail;
