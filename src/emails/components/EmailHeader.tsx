import { Section, Text } from "@react-email/components"

export function EmailHeader() {
  return (
    <Section
      style={{
        backgroundColor: "#B3895D",
        padding: "28px 40px",
        textAlign: "center" as const,
      }}
    >
      <Text
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: "22px",
          fontWeight: "bold",
          color: "#FDFDFD",
          margin: "0 0 6px",
          letterSpacing: "0.02em",
        }}
      >
        Butlers Inc.
      </Text>
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
