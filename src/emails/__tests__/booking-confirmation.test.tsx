import { describe, it, expect } from "vitest"
import { render } from "@react-email/components"
import { BookingConfirmationEmail } from "../booking-confirmation"
import type { BookingEmailProps } from "../types"

const baseProps: BookingEmailProps = {
  reference: "BT-TEST1",
  butlerType: "Lifestyle",
  serviceOption: "Personal Shopping",
  dayOption: "nextDay",
  timeSlot: "morning",
  name: "Jane Smith",
  email: "jane@example.com",
  phone: "+44 7700 900123",
  notes: null,
  formattedDate: "Thursday, 26 March 2026",
  priceLabel: "from £55/hr",
  timeSlotLabel: "Morning (7:00 - 11:59)",
}

const genieProps: BookingEmailProps = {
  ...baseProps,
  butlerType: "bespoke",
  serviceOption: "genie",
  notes: "Source a sold-out designer handbag before the weekend",
}

describe("BookingConfirmationEmail", () => {
  describe("regular booking", () => {
    it("shows 'Your booking is confirmed' heading", async () => {
      const html = await render(<BookingConfirmationEmail {...baseProps} />)
      expect(html).toContain("Your booking is confirmed")
    })
  })

  describe("genie booking", () => {
    it("shows 'Your wish has been received' heading", async () => {
      const html = await render(<BookingConfirmationEmail {...genieProps} />)
      expect(html).toContain("Your wish has been received")
      expect(html).not.toContain("Your booking is confirmed")
    })

    it("shows Genie-specific body text", async () => {
      const html = await render(<BookingConfirmationEmail {...genieProps} />)
      expect(html).toContain("your wish")
      expect(html).toContain("already on it")
    })

    it("shows 'Genie' in the service row", async () => {
      const html = await render(<BookingConfirmationEmail {...genieProps} />)
      expect(html).toContain("Genie")
      expect(html).toContain("Urgent Request")
    })
  })
})
