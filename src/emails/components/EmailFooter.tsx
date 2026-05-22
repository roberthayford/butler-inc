import { Hr, Link, Section, Text } from "@react-email/components"

export function EmailFooter() {
  const year = new Date().getFullYear()

  return (
    <Section
      style={{
        backgroundColor: "#262F3D",
        padding: "28px 40px",
        textAlign: "center" as const,
      }}
    >
      <Hr style={{ borderColor: "#3A4556", margin: "0 0 20px" }} />
      <Text
        style={{
          fontFamily: "'Helvetica Neue', Arial, sans-serif",
          fontSize: "12px",
          color: "#9E9893",
          margin: "0 0 8px",
          lineHeight: "1.6",
        }}
      >
        © {year} Butlers Inc. · All rights reserved
      </Text>
      <Text
        style={{
          fontFamily: "'Helvetica Neue', Arial, sans-serif",
          fontSize: "12px",
          color: "#9E9893",
          margin: "0 0 8px",
        }}
      >
        <Link
          href="mailto:hello@butlersinc.com"
          style={{ color: "#B3895D", textDecoration: "none" }}
        >
          hello@butlersinc.com
        </Link>
      </Text>
      <Text
        style={{
          fontFamily: "'Helvetica Neue', Arial, sans-serif",
          fontSize: "11px",
          color: "#6B7280",
          margin: 0,
        }}
      >
        <Link
          href="https://butlersinc.com/privacy"
          style={{ color: "#6B7280", textDecoration: "underline" }}
        >
          Privacy
        </Link>
        {" · "}
        <Link
          href="https://butlersinc.com/terms"
          style={{ color: "#6B7280", textDecoration: "underline" }}
        >
          Terms
        </Link>
      </Text>
    </Section>
  )
}
