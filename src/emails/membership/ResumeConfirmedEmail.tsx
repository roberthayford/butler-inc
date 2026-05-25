import { Button, Text } from "@react-email/components";
import { MembershipEmailLayout } from "./components/MembershipEmailLayout";

export interface ResumeConfirmedEmailProps { name: string; tierName: string; }

export function ResumeConfirmedEmail({ name, tierName }: ResumeConfirmedEmailProps) {
  const first = name.split(" ")[0] ?? name;
  return (
    <MembershipEmailLayout
      preview="Hours available, billing resumed."
      heading={`Welcome back to your Butlers Inc ${tierName}`}
    >
      <Text style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: "15px", color: "#4A5568", lineHeight: "1.6", margin: "0 0 18px" }}>
        {`Hello ${first}, your ${tierName} membership is active again. Billing resumes today and your hours are available immediately.`}
      </Text>
      <Button
        href="https://butlersinc.com/members/dashboard"
        style={{ backgroundColor: "#B3895D", color: "#FCFBF9", padding: "12px 20px", borderRadius: "4px", fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: "14px", textDecoration: "none" }}
      >
        Book a butler
      </Button>
    </MembershipEmailLayout>
  );
}

ResumeConfirmedEmail.PreviewProps = { name: "Ada", tierName: "Lite" } satisfies ResumeConfirmedEmailProps;
export default ResumeConfirmedEmail;
