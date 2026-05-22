import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components"
import { EmailHeader } from "./components/EmailHeader"
import { EmailFooter } from "./components/EmailFooter"
import { DetailRow } from "./components/DetailRow"
import type { BookingEmailProps } from "./types"

export function BookingNotificationEmail({
  reference,
  butlerType,
  serviceOption,
  formattedDate,
  priceLabel,
  timeSlotLabel,
  name,
  email,
  phone,
  notes,
  hourlyRate,
  durationHours,
  urgencyMultiplier,
  urgencyLabel,
  totalPrice,
  isPaid,
}: BookingEmailProps) {
  const hasPricing = totalPrice != null && hourlyRate != null;
  const isGenie = serviceOption === "genie";
  const receivedAt = new Date().toLocaleString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <Html lang="en">
      <Head />
      <Preview>
        New booking {reference} — {butlerType} Butler · {formattedDate}
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
          <Section style={{ padding: "32px 40px 24px" }}>
            {/* Badge */}
            <Text
              style={{
                display: "inline-block",
                backgroundColor: isGenie ? "#CC3333" : "#5B9473",
                color: "#FDFDFD",
                fontFamily: "'Helvetica Neue', Arial, sans-serif",
                fontSize: "11px",
                fontWeight: "600",
                letterSpacing: "0.1em",
                textTransform: "uppercase" as const,
                padding: "4px 12px",
                borderRadius: "20px",
                margin: "0 0 16px",
              }}
            >
              {isGenie ? "URGENT — Genie Request" : "New Booking"}
            </Text>

            <Text
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontSize: "24px",
                color: "#262F3D",
                margin: "0 0 6px",
                fontWeight: "normal",
              }}
            >
              {isGenie ? "Urgent Genie Request" : "New Booking Request"}
            </Text>
            <Text
              style={{
                fontFamily: "'Helvetica Neue', Arial, sans-serif",
                fontSize: "13px",
                color: "#9E9893",
                margin: "0 0 28px",
              }}
            >
              Received: {receivedAt}
            </Text>

            {isGenie && notes && (
              <Section
                style={{
                  backgroundColor: "#FFF5F5",
                  borderLeft: "3px solid #CC3333",
                  borderRadius: "4px",
                  padding: "12px 16px",
                  marginBottom: "20px",
                }}
              >
                <Text
                  style={{
                    fontFamily: "'Helvetica Neue', Arial, sans-serif",
                    fontSize: "11px",
                    color: "#CC3333",
                    textTransform: "uppercase" as const,
                    letterSpacing: "0.08em",
                    margin: "0 0 6px",
                    fontWeight: "600",
                  }}
                >
                  Customer&apos;s Wish
                </Text>
                <Text
                  style={{
                    fontFamily: "Georgia, 'Times New Roman', serif",
                    fontSize: "14px",
                    color: "#262F3D",
                    margin: 0,
                    lineHeight: "1.5",
                    fontStyle: "italic",
                  }}
                >
                  {notes}
                </Text>
              </Section>
            )}

            {/* Booking details */}
            <DetailRow label="Reference" value={reference} />
            <DetailRow label="Butler" value={`${butlerType} Butler`} />
            <DetailRow label="Service" value={serviceOption ?? "Bespoke"} />
            <DetailRow label="Date" value={formattedDate} />
            <DetailRow label="Time" value={timeSlotLabel} />

            {hasPricing ? (
              <Section
                style={{
                  backgroundColor: "#F7F5F0",
                  borderRadius: "4px",
                  padding: "12px 16px",
                  marginTop: "12px",
                }}
              >
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
                <Text
                  style={{
                    fontFamily: "'Helvetica Neue', Arial, sans-serif",
                    fontSize: "12px",
                    color: isPaid ? "#5B9473" : "#CC6600",
                    margin: "6px 0 0",
                    fontWeight: "600",
                  }}
                >
                  {isPaid ? "✓ Payment received" : "⏳ Payment pending"}
                </Text>
              </Section>
            ) : (
              <DetailRow label="Pricing" value={priceLabel} />
            )}

            <Hr style={{ borderColor: "#E8E4DC", margin: "28px 0" }} />

            {/* Customer details */}
            <DetailRow label="Name" value={name} />
            <DetailRow label="Email" value={email} />
            <DetailRow label="Phone" value={phone} />
            {notes && <DetailRow label="Notes" value={notes} />}
          </Section>

          <EmailFooter />
        </Container>
      </Body>
    </Html>
  )
}

BookingNotificationEmail.PreviewProps = {
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

export default BookingNotificationEmail
