import {
  Body,
  Container,
  Font,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components"
import { EmailHeader } from "./components/EmailHeader"
import { EmailFooter } from "./components/EmailFooter"
import { DetailRow } from "./components/DetailRow"
import type { BookingEmailProps } from "./types"

export function BookingConfirmationEmail({
  reference,
  butlerType,
  serviceOption,
  formattedDate,
  priceLabel,
  timeSlotLabel,
  name,
  hourlyRate,
  durationHours,
  urgencyMultiplier,
  urgencyLabel,
  subtotal,
  totalPrice,
  isPaid,
}: BookingEmailProps) {
  const hasPricing = totalPrice != null && hourlyRate != null;
  const isGenie = serviceOption === "genie";
  return (
    <Html lang="en">
      <Head>
        <Font
          fontFamily="Georgia"
          fallbackFontFamily="serif"
          webFont={undefined}
        />
      </Head>
      <Preview>
        Your Butlers Inc. booking {reference} is confirmed. We&apos;ll be in touch within 30 minutes.
      </Preview>
      <Body style={{ backgroundColor: "#FCFBF9", margin: 0, padding: "40px 0" }}>
        <Container
          style={{
            maxWidth: "560px",
            margin: "0 auto",
            backgroundColor: "#FCFBF9",
            borderRadius: "4px",
            overflow: "hidden",
            boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
          }}
        >
          <EmailHeader />

          {/* Body */}
          <Section style={{ padding: "36px 40px 24px" }}>
            <Text
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontSize: "26px",
                color: "#262F3D",
                margin: "0 0 12px",
                fontWeight: "normal",
                lineHeight: "1.3",
              }}
            >
              {isGenie ? "Your wish has been received" : "Your booking is confirmed"}
            </Text>
            <Text
              style={{
                fontFamily: "'Helvetica Neue', Arial, sans-serif",
                fontSize: "15px",
                color: "#4A5568",
                margin: "0 0 28px",
                lineHeight: "1.6",
              }}
            >
              {isGenie
                ? `Thank you, ${name}. We've received your wish and our team is already on it.`
                : `Thank you, ${name}. We've received your request and our team is reviewing the details now.`}
            </Text>

            {/* Reference card */}
            <Section
              style={{
                backgroundColor: "#F7F5F0",
                borderRadius: "4px",
                padding: "20px 24px",
                marginBottom: "28px",
                textAlign: "center" as const,
              }}
            >
              <Text
                style={{
                  fontFamily: "'Helvetica Neue', Arial, sans-serif",
                  fontSize: "11px",
                  color: "#9E9893",
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.1em",
                  margin: "0 0 6px",
                }}
              >
                Your reference
              </Text>
              <Text
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontSize: "28px",
                  color: "#B3895D",
                  margin: 0,
                  letterSpacing: "0.12em",
                  fontWeight: "normal",
                }}
              >
                {reference}
              </Text>
            </Section>

            {/* Detail rows */}
            <DetailRow label="Service" value={`${butlerType} Butler`} />
            <DetailRow label="Booking" value={isGenie ? "Genie · Urgent Request" : (serviceOption ?? "Bespoke")} />
            <DetailRow label="Date" value={formattedDate} />
            <DetailRow label="Time" value={timeSlotLabel} />

            {hasPricing ? (
              <Section
                style={{
                  backgroundColor: "#F7F5F0",
                  borderRadius: "4px",
                  padding: "16px 20px",
                  marginTop: "16px",
                  marginBottom: "8px",
                }}
              >
                <Text
                  style={{
                    fontFamily: "'Helvetica Neue', Arial, sans-serif",
                    fontSize: "11px",
                    color: "#9E9893",
                    textTransform: "uppercase" as const,
                    letterSpacing: "0.08em",
                    margin: "0 0 10px",
                  }}
                >
                  Price Breakdown
                </Text>
                <DetailRow
                  label="Rate"
                  value={`£${hourlyRate!.toFixed(2)}/hr × ${durationHours} hrs`}
                />
                {urgencyMultiplier != null && urgencyMultiplier !== 1.0 && (
                  <DetailRow
                    label={urgencyLabel ?? "Urgency"}
                    value={`${urgencyMultiplier}×`}
                  />
                )}
                <DetailRow label="Total" value={`£${totalPrice!.toFixed(2)}`} />
                {isPaid && (
                  <Text
                    style={{
                      fontFamily: "'Helvetica Neue', Arial, sans-serif",
                      fontSize: "12px",
                      color: "#5B9473",
                      margin: "8px 0 0",
                      fontWeight: "600",
                    }}
                  >
                    ✓ Payment received
                  </Text>
                )}
              </Section>
            ) : (
              <DetailRow label="Pricing" value={priceLabel} />
            )}

            <Hr style={{ borderColor: "#E8E4DC", margin: "28px 0 24px" }} />

            {!isGenie && (
              <Text
                style={{
                  fontFamily: "'Helvetica Neue', Arial, sans-serif",
                  fontSize: "14px",
                  color: "#4A5568",
                  margin: "0 0 12px",
                  lineHeight: "1.6",
                }}
              >
                Book regularly? A Butlers Inc membership can help you save money with prepaid butler hours, Virtual Butler tasks, and no surcharges.
              </Text>
            )}

            {/* Reassurance */}
            <Text
              style={{
                fontFamily: "'Helvetica Neue', Arial, sans-serif",
                fontSize: "14px",
                color: "#4A5568",
                margin: "0 0 12px",
                lineHeight: "1.6",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: "8px",
                  height: "8px",
                  backgroundColor: "#5B9473",
                  borderRadius: "50%",
                  marginRight: "8px",
                  verticalAlign: "middle",
                }}
              />
              We&apos;ll be in touch within 30 minutes to confirm the details.
            </Text>
            <Text
              style={{
                fontFamily: "'Helvetica Neue', Arial, sans-serif",
                fontSize: "14px",
                color: "#9E9893",
                margin: 0,
                lineHeight: "1.6",
              }}
            >
              Questions? Reply to this email or contact us at{" "}
              <Link
                href="mailto:hello@butlersinc.com"
                style={{ color: "#B3895D", textDecoration: "none" }}
              >
                hello@butlersinc.com
              </Link>
            </Text>
          </Section>

          <EmailFooter />
        </Container>
      </Body>
    </Html>
  )
}

BookingConfirmationEmail.PreviewProps = {
  reference: "BT-X7K2P",
  butlerType: "Lifestyle",
  serviceOption: "Personal Shopping",
  dayOption: "nextDay" as const,
  specificDate: undefined,
  timeSlot: "morning" as const,
  name: "Amelia Rhodes",
  email: "amelia@example.com",
  phone: "+44 7700 900123",
  notes: "Please bring fabric swatches for the Notting Hill apartment.",
  formattedDate: "Thursday, 26 March 2026",
  priceLabel: "from £55/hr",
  timeSlotLabel: "Morning (7:00 - 11:59)",
} satisfies BookingEmailProps

export default BookingConfirmationEmail
