import { Button, Text } from "@react-email/components";
import { MembershipEmailLayout } from "./components/MembershipEmailLayout";

export interface PauseConfirmedEmailProps { name: string; tierName: string; }

export function PauseConfirmedEmail({ name, tierName }: PauseConfirmedEmailProps) {
  const first = name.split(" ")[0] ?? name;
  return (
    <MembershipEmailLayout
      preview="Billing is suspended. Resume anytime."
      heading={`Your Butlers Inc ${tierName} is paused`}
    >
      <Text style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: "15px", color: "#4A5568", lineHeight: "1.6", margin: "0 0 18px" }}>
        {`Hello ${first}, your ${tierName} membership is paused. Billing is suspended and member pricing is unavailable until you resume. Your usage and renewal date pick up where you left off.`}
      </Text>
      <Button
        href="https://butlersinc.com/members/settings"
        style={{ backgroundColor: "#B3895D", color: "#FCFBF9", padding: "12px 20px", borderRadius: "4px", fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: "14px", textDecoration: "none" }}
      >
        Resume membership
      </Button>
    </MembershipEmailLayout>
  );
}

PauseConfirmedEmail.PreviewProps = { name: "Ada", tierName: "Lite" } satisfies PauseConfirmedEmailProps;
export default PauseConfirmedEmail;
