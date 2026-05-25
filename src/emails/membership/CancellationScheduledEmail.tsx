import { Button, Text } from "@react-email/components";
import { MembershipEmailLayout } from "./components/MembershipEmailLayout";

export interface CancellationScheduledEmailProps { name: string; tierName: string; endsAt: string; }

export function CancellationScheduledEmail({ name, tierName, endsAt }: CancellationScheduledEmailProps) {
  const first = name.split(" ")[0] ?? name;
  return (
    <MembershipEmailLayout
      preview="Reactivate before then to keep your slot."
      heading={`Your Butlers Inc ${tierName} cancels on ${endsAt}`}
    >
      <Text style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: "15px", color: "#4A5568", lineHeight: "1.6", margin: "0 0 18px" }}>
        {`Hello ${first}, we've scheduled your ${tierName} cancellation for ${endsAt}. You still have access until then, including any remaining hours. Reactivate any time before ${endsAt} and nothing changes.`}
      </Text>
      <Button
        href="https://butlersinc.com/members/settings"
        style={{ backgroundColor: "#B3895D", color: "#FCFBF9", padding: "12px 20px", borderRadius: "4px", fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: "14px", textDecoration: "none" }}
      >
        Reactivate
      </Button>
    </MembershipEmailLayout>
  );
}

CancellationScheduledEmail.PreviewProps = { name: "Ada", tierName: "Pro", endsAt: "25 Jun 2026" } satisfies CancellationScheduledEmailProps;
export default CancellationScheduledEmail;
