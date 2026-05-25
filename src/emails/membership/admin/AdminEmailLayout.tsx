import { Body, Container, Head, Html, Preview, Section, Text } from "@react-email/components";
import { EmailHeader } from "@/emails/components/EmailHeader";
import { EmailFooter } from "@/emails/components/EmailFooter";

interface Props { preview: string; heading: string; children: React.ReactNode; }

export function AdminEmailLayout({ preview, heading, children }: Props) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: "#FCFBF9", margin: 0, padding: "40px 0" }}>
        <Container style={{ maxWidth: "560px", margin: "0 auto", backgroundColor: "#FCFBF9", borderRadius: "4px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
          <EmailHeader />
          <Section style={{ padding: "32px 40px 24px" }}>
            <Text style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "22px", color: "#262F3D", margin: "0 0 12px", fontWeight: "normal" }}>
              {heading}
            </Text>
            {children}
          </Section>
          <EmailFooter />
        </Container>
      </Body>
    </Html>
  );
}
