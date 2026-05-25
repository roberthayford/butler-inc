import { Button, Text } from "@react-email/components";
import { MembershipEmailLayout } from "./components/MembershipEmailLayout";

export interface CancellationFinalEmailProps { name: string; tierName: string; endedAt: string; }

export function CancellationFinalEmail({ name, tierName, endedAt }: CancellationFinalEmailProps) {
  const first = name.split(" ")[0] ?? name;
  return (
    <MembershipEmailLayout
      preview="Thank you. The door's open if you want to return."
      heading={`Your Butlers Inc ${tierName} has ended`}
    >
      <Text style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: "15px", color: "#4A5568", lineHeight: "1.6", margin: "0 0 18px" }}>
        {`Hello ${first}, your ${tierName} membership ended on ${endedAt}. Thank you for being a member. If you want to come back, your account stays put and resubscribing takes a minute.`}
      </Text>
      <Button
        href="https://butlersinc.com/membership"
        style={{ backgroundColor: "#B3895D", color: "#FCFBF9", padding: "12px 20px", borderRadius: "4px", fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: "14px", textDecoration: "none" }}
      >
        View plans
      </Button>
    </MembershipEmailLayout>
  );
}

CancellationFinalEmail.PreviewProps = { name: "Ada", tierName: "Frequent", endedAt: "25 Jun 2026" } satisfies CancellationFinalEmailProps;
export default CancellationFinalEmail;
