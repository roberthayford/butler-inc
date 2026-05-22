import { Column, Row, Text } from "@react-email/components"

interface DetailRowProps {
  label: string
  value: string
}

export function DetailRow({ label, value }: DetailRowProps) {
  return (
    <Row
      style={{
        borderBottom: "1px solid #E8E4DC",
        padding: "10px 0",
      }}
    >
      <Column style={{ width: "35%" }}>
        <Text
          style={{
            fontFamily: "'Helvetica Neue', Arial, sans-serif",
            fontSize: "12px",
            color: "#9E9893",
            margin: 0,
            textTransform: "uppercase" as const,
            letterSpacing: "0.06em",
          }}
        >
          {label}
        </Text>
      </Column>
      <Column style={{ width: "65%" }}>
        <Text
          style={{
            fontFamily: "'Helvetica Neue', Arial, sans-serif",
            fontSize: "14px",
            color: "#262F3D",
            margin: 0,
            fontWeight: "500",
          }}
        >
          {value}
        </Text>
      </Column>
    </Row>
  )
}
