import { Img, Section, Text } from "@react-email/components"

export function EmailHeader() {
  return (
    <Section
      style={{
        backgroundColor: "#B3895D",
        padding: "28px 40px",
        textAlign: "center" as const,
      }}
    >
      <Img
        src="https://butlersinc.com/images/butlers-inc-logo.webp"
        alt="Butlers Inc."
        width={140}
        style={{ display: "inline-block", margin: "0 auto 10px" }}
      />
      <Text
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: "13px",
          letterSpacing: "0.15em",
          color: "#FDFDFD",
          margin: 0,
          textTransform: "uppercase" as const,
          opacity: 0.85,
        }}
      >
        Life, handled.
      </Text>
    </Section>
  )
}
